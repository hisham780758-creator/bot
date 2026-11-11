const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const P = require("pino");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
    });

    sock.ev.on("creds.update", saveCreds);

    // مهلة 5 ثوانٍ لضمان استقرار الاتصال قبل فحص أو طلب الكود
    await new Promise(resolve => setTimeout(resolve, 5000));

    // طلب الكود فقط إذا لم تكن الجلسة محفوظة مسبقاً
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

    // إدارة الاتصال وإعادة المحاولة الذكية دون فقدان الجلسة
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log("⚠️ Disconnected from WhatsApp servers.");
            
            if (shouldReconnect) {
                console.log("🔄 Auto-reconnecting silently in background...");
                setTimeout(() => startBot(), 5000); // إعادة المحاولة تلقائياً بدون كود جديد
            } else {
                console.log("❌ Session logged out. Please clear session and re-pair.");
            }
        } else if (connection === "open") {
            console.log("✅ Bot connected successfully and running 24/7!");
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages.messages?.[0] || messages[0];
        if (!m.message || m.key.fromMe) return;
        // أضف أوامر البوت هنا
    });
}

startBot();
