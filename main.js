const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs-extra');

// رقم الهاتف الخاص بك لطلب كود الاقتران
const phoneNumber = "967780758757";

async function startBot() {
    // استقبال مسار مجلد الاتصال القادم من index.js (ملف_الاتصال) أو استخدام session كاحتياطي
    const sessionDir = process.env.CONNECTION_FOLDER || path.join(__dirname, 'session');
    
    // التأكد من أن المجلد موجود
    await fs.ensureDir(sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // نعتمد على كود الاقتران (Pairing Code)
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
        },
        browser: ["Ubuntu", "Chrome", "20.04.0"]
    });

    // إذا لم يكن الجهاز مسجلاً، اطلب كود الاقتران بعد ثوانٍ قليلة لضمان استقرار الاتصال
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`\n========================================`);
                console.log(`🔑 كود الاقتران الخاص بك هو: ${code}`);
                console.log(`========================================\n`);
            } catch (err) {
                console.error('❌ حدث خطأ أثناء طلب كود الاقتران:', err);
            }
        }, 6000); // مهلة 6 ثواني لضمان عمل السوكت بنجاح
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
            console.log('✅ تم الاتصال بالواتساب بنجاح!');
            // إرسال إشارة للـ index.js أن البوت جاهز وعمل بنجاح
            if (process.send) process.send('ready');
        }

        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log(`⚠️ انقطع الاتصال بسبب: ${lastDisconnect?.error}, رمز الخطأ: ${statusCode}`);
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ تم تسجيل الخروج من الجهاز، يرجى حذف مجلد الاتصال وإعادة الربط.');
                process.exit(1);
            } else {
                // إبلاغ index.js بإعادة التشغيل أو إعادة الاتصال تلقائياً
                if (process.send) {
                    process.send('reset');
                } else {
                    startBot();
                }
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // استقبال رسائل أو أحداث إضافية إذا لزم الأمر
    sock.ev.on('messages.upsert', async ({ messages }) => {
        // يمكنك وضع معالج الرسائل هنا إذا رغبت
    });
}

startBot();
