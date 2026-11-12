const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require('fs');
const path = require('path');

// استيراد كافة المعالجات وأنظمة الحماية والرصد والترحيب
const { handleMessages } = require('./messages');         //[span_0](start_span)[span_0](end_span)
const { initAntiContacts } = require('./anti_contacts');   //[span_1](start_span)[span_1](end_span)
const { initAntiTourism } = require('./anti_tourism');     //[span_2](start_span)[span_2](end_span)
const { initSecurityListener } = require('./SecurityHandler'); //[span_3](start_span)[span_3](end_span)
const Joining = require('./Joining');                       //[span_4](start_span)[span_4](end_span)
const welcome = require('./welcome');                       //[span_5](start_span)[span_5](end_span)
const startPeriodicScan = require('./periodic');            //[span_6](start_span)[span_6](end_span)

async function startBot() {
    const sessionDir = path.join(__dirname, 'session');
    
    // التأكد من وجود مجلد الجلسة محلياً
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    // استعادة بيانات الجلسة من متغيرات البيئة (GitHub Secrets) تلقائياً
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

    // طلب كود الاقتران تلقائياً إذا لم تكن الجلسة مسجلة
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

    // إدارة الاتصال وإعادة المحاولة الذكية
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
            
            // تفعيل كافة أنظمة الحماية، الرادارات، والدوريات فور الاتصال
            try {
                initAntiContacts(sock);      //[span_7](start_span)[span_7](end_span)
                initAntiTourism(sock);       //[span_8](start_span)[span_8](end_span)
                initSecurityListener(sock);  //[span_9](start_span)[span_9](end_span)
                startPeriodicScan(sock);     //[span_10](start_span)[span_10](end_span)
                console.log("🛡️ All security handlers, anti-spam radars, and systems are fully active.");
            } catch (e) {
                console.log("[ ERROR ] Initializing security systems:", e);
            }
        }
    });

    // ربط حدث تحديث أعضاء المجموعات (للتشغيل التلقائي للترحيب والرصد)
    sock.ev.on("group-participants.update", async (update) => {
        try {
            if (typeof welcome === 'function') {
                await welcome(sock, update); //[span_11](start_span)[span_11](end_span)
            }
        } catch (err) {
            console.log("[ ERROR in group-participants.update routing ]:", err);
        }
    });

    // معالجة الرسائل الواردة والأوامر وطلبات الانضمام
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            if (typeof handleMessages === 'function') {
                await handleMessages(sock, chatUpdate); //[span_12](start_span)[span_12](end_span)
            }
            if (typeof Joining === 'function') {
                await Joining(sock, chatUpdate); //[span_13](start_span)[span_13](end_span)
            }
        } catch (err) {
            console.log("[ ERROR in messages.upsert routing ]:", err);
        }
    });
}

startBot();
