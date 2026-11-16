import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prefix = '/';

// ========== تحميل الأوامر ==========
const commands = new Map();

async function loadCommands() {
    const pluginsDir = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir);
        console.log('📁 تم إنشاء مجلد plugins');
        return;
    }

    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
        try {
            const module = await import(`./plugins/${file}`);
            const command = module.default;
            if (command && command.command) {
                commands.set(command.command, module);
                console.log(`✅ تم تحميل: ${file}`);
            }
        } catch (error) {
            console.error(`❌ خطأ في تحميل ${file}:`, error);
        }
    }
}

// ========== تشغيل البوت ==========
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    version: [2, 3000, 1015901307],   // <--- حط هذا السطر هنا
    // يمكن فيه أسطر ثانية هنا
})    })

    // ====== تسجيل الدخول ======
    if (!state.creds.registered) {
        console.log('📱 أدخل رقم هاتفك (مثال: 967713313352):');
        
        const phoneNumber = await new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                resolve(data.toString().trim());
            });
        });

        try {
            const code = await conn.requestPairingCode(phoneNumber);
            console.log(`🔑 كود التفعيل: ${code}`);
            console.log('📲 أدخل الكود في واتساب');
        } catch (error) {
            console.error('❌ خطأ:', error);
            process.exit(1);
        }
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ البوت متصل!');
            console.log(`🤖 يعمل كـ: ${conn.user.name}`);
        }
    });

    // ====== معالجة الرسائل ======
    conn.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        let text = '';
        if (msg.message.conversation) text = msg.message.conversation;
        else if (msg.message.extendedTextMessage) text = msg.message.extendedTextMessage.text;
        else return;

        if (sender === conn.user.id) return;

        if (text.startsWith(prefix)) {
            const cmd = text.slice(1).trim().split(' ')[0];
            const args = text.slice(1).trim().split(' ').slice(1);

            if (commands.has(cmd)) {
                try {
                    const handler = commands.get(cmd).default;
                    await handler.execute(conn, msg, args);
                } catch (error) {
                    console.error('❌ خطأ:', error);
                }
            }
        }
    });

    return conn;
}

// ========== التشغيل ==========
console.log('🚀 جاري تشغيل البوت...');
await loadCommands();
await startBot();
