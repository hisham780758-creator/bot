const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require('fs');
const path = require('path');
const readline = require("readline");

const { handleMessages } = require('./handlers/messages');
const { initAntiContacts } = require('./handlers/anti_contacts');
const { initAntiTourism } = require('./handlers/anti_tourism');
const { initSecurityListener } = require('./handlers/SecurityHandler');
const Joining = require('./handlers/Joining');
const welcome = require('./handlers/welcome');
const startPeriodicScan = require('./handlers/periodic');

const phoneNumber = "967780758757"; // رقمك الأساسي

async function startBot() {
    const sessionDir = path.join(__dirname, 'session');
    
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" })),
        },
        browser: ["Chrome (Linux)", "", ""]
    });

    // إذا لم يكن مسجلاً، اطلب كود الاقتران واعرضه في سجلات Railway
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n========================================`);
                console.log(`🔑 PAIRING CODE FOR WHATSAPP: ${code}`);
                console.log(`========================================\n`);
            } catch (error) {
                console.error("Error requesting pairing code:", error);
            }
        }, 3000);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`⚠️ Disconnected. Status Code: ${statusCode}`);
            
            if (shouldReconnect) {
                setTimeout(() => startBot(), 5000);
            } else {
                console.log("❌ Session logged out.");
            }
        } else if (connection === "open") {
            console.log("✅ Bot connected successfully and running 24/7 on Railway!");
            
            try {
                initAntiContacts(sock);
                initAntiTourism(sock);
                initSecurityListener(sock);
                startPeriodicScan(sock);
                console.log("🛡️ All security handlers are fully active.");
            } catch (e) {
                console.log("[ ERROR ] Initializing systems:", e);
            }
        }
    });

    sock.ev.on("group-participants.update", async (update) => {
        try {
            if (typeof welcome === 'function') await welcome(sock, update);
        } catch (err) {}
    });

    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            if (typeof handleMessages === 'function') await handleMessages(sock, chatUpdate);
            if (typeof Joining === 'function') await Joining(sock, chatUpdate);
        } catch (err) {}
    });
}

startBot();
