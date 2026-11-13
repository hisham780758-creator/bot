const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require('fs');
const path = require('path');

const { handleMessages } = require('./handlers/messages');
const { initAntiContacts } = require('./handlers/anti_contacts');
const { initAntiTourism } = require('./handlers/anti_tourism');
const { initSecurityListener } = require('./handlers/SecurityHandler');
const Joining = require('./handlers/Joining');
const welcome = require('./handlers/welcome');
const startPeriodicScan = require('./handlers/periodic');

async function startBot() {
    const sessionDir = path.join(__dirname, 'session');
    
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    // استعادة الجلسة من متغير البيئة SESSION_DATA بدقة
    if (process.env.SESSION_DATA) {
        const credsPath = path.join(sessionDir, 'creds.json');
        try {
            // التحقق مما إذا كانت البيانات مدخلة كـ JSON أو نص خام
            let sessionData = process.env.SESSION_DATA;
            if (typeof sessionData === 'string' && !sessionData.trim().startsWith('{')) {
                // إذا كانت مخزنة بطريقة ما، نتركها كما هي
            }
            fs.writeFileSync(credsPath, sessionData);
            console.log("[ INFO ] Session restored successfully from Railway Environment Variables!");
        } catch (e) {
            console.log("[ ERROR ] Failed to write session data:", e);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`⚠️ Disconnected from WhatsApp servers. Status Code: ${statusCode}`);
            
            if (shouldReconnect) {
                console.log("🔄 Auto-reconnecting silently in background...");
                setTimeout(() => startBot(), 5000);
            } else {
                console.log("❌ Session logged out. Please re-pair.");
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
                console.log("[ ERROR ] Initializing security systems:", e);
            }
        }
    });

    sock.ev.on("group-participants.update", async (update) => {
        try {
            if (typeof welcome === 'function') {
                await welcome(sock, update);
            }
        } catch (err) {
            console.log("[ ERROR in group-participants.update routing ]:", err);
        }
    });

    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            if (typeof handleMessages === 'function') {
                await handleMessages(sock, chatUpdate);
            }
            if (typeof Joining === 'function') {
                await Joining(sock, chatUpdate);
            }
        } catch (err) {
            console.log("[ ERROR in messages.upsert routing ]:", err);
        }
    });
}

startBot();
