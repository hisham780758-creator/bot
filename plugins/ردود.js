... 
const fs = require('fs');
const { join } = require('path');
const { eliteNumbers } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

// دالة لمساعدتنا في فك تشفير JID والحصول على الرقم فقط
const decodeJid = (jid) => (jidDecode(jid)?.user || jid.split('@')[0]);
const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

// هنا يتم تحديد الصورة الثابتة التي سيتم الرد بها.
// يمكنك وضع رابط URL لصورة من الإنترنت أو مسار ملف محلي.
const staticImageURL = 'https://i.imgur.com/your-image.png'; // <<<<<<< ضع رابط صورتك هنا

const autoReplies = {
    'السلام عليكم': 'وعليكم السلام ورحمة الله وبركاته',
    'هلا': 'بـس اســكــت🐦😂',
    'صباح الخير': 'صـبـاحـ الـنـور يـمـز/ه 🐦🫦',
    'كيفك': 'الـحـمـد لـلـه بـخـيــر و انـت؟',
    'شكرا': 'الـعـفـو🐦❤️',
    'احا': 'بـس يـسـطا مـمـكـن يـبـقـا فـيـه بـنـات مزز 🫦🍷',
    'معاق': 'بـايـن مـفـيـش غـيـرك🐦🐦😂',
    'اسكانور ': 'نـعـم يـقـلـبـي',
    'هات بوثه..': 'بـمـوافـقـه بـانـي لـلـتـربـيـه و الـتـعـلـيـم😂😂',
    'كسمك': 'كسمين امك يمعرص يخول روح شوفلك كلبه تنيكك',
};

// هذا للتأكد من أننا نربط مستمع الرسائل مرة واحدة فقط
let isListenerActive = false;

module.exports = {
    command: 'رد',
    description: 'تشغيل أو إيقاف الرد التلقائي.',
    usage: '.رد [فتح/قفل]',
    category: 'tools',

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const sender = decode(msg.key.participant || jid);
        const senderLid = sender.split('@')[0];

        // التحقق من صلاحيات المستخدم (يجب أن يكون من النخبة)
        if (!eliteNumbers.includes(senderLid)) {
            return await sock.sendMessage(jid, {
                text: '❗ لا تملك صلاحية استخدام هذا الأمر.'
            }, { quoted: msg });
        }

        const args = msg.args || [];
        const autoReplyPath = join(__dirname, '../data', 'autoReply.txt');

        // عرض الحالة الحالية عند كتابة الأمر بدون وسيط
        if (!args[0]) {
            let currentStatus = '[قفل]';
            try {
                if (fs.existsSync(autoReplyPath)) {
                    currentStatus = fs.readFileSync(autoReplyPath, 'utf8').trim();
                }
            } catch (err) {
                console.error('فشل قراءة حالة الردود:', err.message);
            }

            return await sock.sendMessage(jid, {
                text: `حالة الردود التلقائية: ${currentStatus}`
            }, { quoted: msg });
        }

        // معالجة وسيط الأمر (فتح/قفل)
        const action = args[0].toLowerCase();
        if (!['فتح', 'قفل'].includes(action)) {
            return await sock.sendMessage(jid, {
                text: '❗ استخدم: .رد فتح أو .رد قفل'
            }, { quoted: msg });
        }

        try {
            fs.writeFileSync(autoReplyPath, `[${action}]`);
            await sock.sendMessage(jid, {
                text: action === 'فتح' ? '✅ تم تفعيل الردود التلقائية.' : '❌ تم إيقاف الردود التلقائية.'
            }, { quoted: msg });

            // ربط مستمع الرسائل مرة واحدة فقط
            // هذا الجزء سيتم تشغيله فقط في المرة الأولى التي يتم فيها تفعيل الردود
            if (!isListenerActive) {
                isListenerActive = true;
                sock.ev.on('messages.upsert', async (update) => {
                    // قراءة حالة الردود التلقائية من الملف في كل مرة يتم فيها استقبال رسالة
                    const currentStatus = fs.existsSync(autoReplyPath) ? fs.readFileSync(autoReplyPath, 'utf8').trim() : '[قفل]';
                    
                    // تجاهل الرسائل إذا كان الرد التلقائي مقفلاً
                    if (currentStatus === '[قفل]') return;

                    const msg = update.messages[0];
                    const currentChatJid = msg.key.remoteJid;

                    // تجاهل الرسائل من البوت نفسه
                    if (msg.key.fromMe) {
                        return;
                    }

                    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
                    if (!messageText) return;

                    for (const keyword in autoReplies) {
                        if (autoReplies.hasOwnProperty(keyword)) {
                            if (messageText.toLowerCase().includes(keyword.toLowerCase())) {
                                
                                const senderNumber = decodeJid(msg.key.participant || msg.key.remoteJid);
                                const waMeText = `wa.me/${senderNumber}`;
                                
                                // تجميع النص الذي سيظهر كشرح للصورة
                                const captionText = `${autoReplies[keyword]}\n\n> رد تـلُقـائـي مـن كـيـسـاكـي\n\n${waMeText}`;
                                
                                try {
                                    // إرسال صورة مع الشرح
                                    await sock.sendMessage(currentChatJid, {
                                        image: { url: staticImageURL },
                                        caption: captionText,
                                    }, { quoted: msg });
                                    
                                    break;
                                } catch (error) {
                                    console.error(`خطأ في إرسال الرد التلقائي في ${currentChatJid}:`, error);
                                }
                            }
                        }
                    }
                });
            }

        } catch (err) {
            await sock.sendMessage(jid, {
                text: 'حدث خطأ أثناء تحديث حالة الردود التلقائية.'
            }, { quoted: msg });
        }
    }
};