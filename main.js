const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const P = require("pino");

async function startBot() {
    // 1. إعداد حالة المصادقة
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
    });

    sock.ev.on("creds.update", saveCreds);

    // 2. مهلة انتظار 5 ثوانٍ لضمان استقرار اتصال الشبكة تماماً قبل طلب الكود
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. طلب كود الربط إذا لم يكن مسجلاً مسبقاً
    if (!sock.authState.creds.registered) {
        const phoneNumber = "967780758757"; // رقم هاتفك
        console.log("[ SETUP ] Requesting pairing code automatically...");
        
        // مهلة إضافية بسيطة لتأكيد جاهزية السيرفر
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log("\n--- Pairing Information ---");
            console.log(`Pairing Code: ${code}`);
            console.log(`Phone Number: ${phoneNumber}`);
            console.log("-----------------------------\n");
        } catch (error) {
            console.log("[ ERROR ] Failed to get pairing code.");
            console.error(error);
        }
    }

    // 4. إدارة الاتصال وإعادة المحاولة عند الانقطاع
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log("⚠️ Disconnected: Connection Failure");
            if (shouldReconnect) {
                console.log("🔄 Reconnecting...");
                setTimeout(() => startBot(), 5000);
            } else {
                console.log("❌ Connection closed. Please delete session and restart.");
            }
        } else if (connection === "open") {
            console.log("✅ Bot connected successfully and running 24/7!");
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        // هنا يمكنك إضافة أوامر بوتك
    });
}

startBot();
