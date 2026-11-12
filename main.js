const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require('fs');
const path = require('path');

// التصحيح هنا: توجيه المسار إلى داخل مجلد handlers
const { handleMessages } = require('./handlers/messages');
const { initAntiContacts } = require('./anti_contacts');
const { initAntiTourism } = require('./anti_tourism');
const { initSecurityListener } = require('./SecurityHandler');
const Joining = require('./Joining');
const welcome = require('./welcome');
const startPeriodicScan = require('./periodic');

async function startBot() {
    const sessionDir = path.join(__dirname, 'session');
    
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    if (process.env.SESSION_DATA) {
        const credsPath = path.join(sessionDir, 'creds.json');
        if (!fs.existsSync(credsPath)) {
            fs.writeFileSync(credsPath, process.env.SESSION_DATA);
            console.log("[ INFO ] Session restored successfully from GitHub Secrets!");
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

    if (!sock.authState.creds.registered) {
        const phoneNumber = "967780758757";
        console.log("[ SETUP ] Requesting pairing code automatically...");
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log("\n--- Pairing Information ---");
            console.log(`Pairing Code: ${code}`);
            console.log(`Phone Number: ${phoneNumber}`);
            console.log("-----------------------------\n");
        } catch (error) {
            console.log("[ ERROR ] Failed to get pairing code. Retrying...");
            setTimeout(() => startBot(), 5000);
        }
    }

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
            console.log("✅ Bot connected successfully and running 24/7 on GitHub Actions!");
            
            try {
                initAntiContacts(sock);
                initAntiTourism(sock);
                initSecurityListener(sock);
                startPeriodicScan(sock);
                console.log("🛡️ All security handlers, anti-spam radars, and systems are fully active.");
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
