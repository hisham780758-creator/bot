const { jidDecode } = require('@whiskeysockets/baileys');

// دالة لمساعدتنا في فك تشفير JID والحصول على الرقم فقط
const decodeJid = (jid) => (jidDecode(jid)?.user || jid.split('@')[0]);

module.exports = {
    command: 'رد',
    description: 'يستجيب للكلمات المفتاحية برسائل محددة، ويرد على المستخدم بصورته الشخصية.',
usage: '.رد-تلقائي',
    category: 'general',

    async execute(sock, m) {
        // هذا الأمر لا يحتاج لتنفيذ مباشر من المستخدم.
        
        const autoReplies = {
            'السلام عليكم': 'وعليكم السلام ورحمة الله وبركاته',
            'هلا': 'بـس اســكــت🐦😂',
            'صباح الخير': 'صـبـاحـ الـنـور يـمـز/ه 🐦🫦',
            'كيفك': 'الـحـمـد لـلـه بـخـيــر و انـت؟',
            'شكرا': 'الـعـفـو🐦❤️',
            'احا': 'احتين على احتك اخرص بقا ممكن في بنات 🍷',
            'معاق': 'بـايـن مـفـيـش غـيـرك🐦🐦😂',
            'اسكانور': 'نـعـم يـقـلـبـي',
            'هات بوثه': 'بـمـوافـقـه بـانـي لـلـتـربـيـه و الـتـعـلـيـم😂😂',
            'كسمك': 'كسمين امك يمعرص يخول روح شوفلك كلبه تنيكك',
            '😂😂': 'تـدوم الـضـحـكـه يـقـلـبـي 👈🏻❤️👉🏻',
            '🫦': 'بـس يـسـطـا عـيـب انـت فـيـم؟',
            '🐦': 'عـلامـه مـن عـلامـات الـكـدب😂',
            'همم': 'هننننننننن😸', 
            'يحيا': ' وش بدك من تلميذي المز', 
            
             // أضف المزيد من الكلمات والردود هنا
        };
        
        sock.ev.on('messages.upsert', async (update) => {
            const msg = update.messages[0];
            const senderJid = msg.key.remoteJid;
            const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

            if (messageText && !msg.key.fromMe) {
                for (const keyword in autoReplies) {
                    if (autoReplies.hasOwnProperty(keyword)) {
                        if (messageText.toLowerCase().includes(keyword.toLowerCase())) {
                            
                            const senderNumber = decodeJid(msg.key.participant || msg.key.remoteJid);
                            
                            // محاولة الحصول على صورة البروفايل
                            let profilePicture;
                            try {
                                profilePicture = await sock.profilePictureUrl(msg.key.participant || msg.key.remoteJid, 'image');
                            } catch (e) {
                                console.error('فشل في الحصول على صورة البروفايل، سيتم الاستمرار بدونها.');
                                profilePicture = null; // تعيينها إلى null إذا فشل
                            }

                            // تجميع الرسالة مع إضافة النص المخصص
                            const replyText = `${autoReplies[keyword]}\n\n> رد تـلُقـائـي مـن 𝑺𝑶𝑵𝑮̷`;
                            
                            try {
                                // إرسال الرسالة كـ reply
                                if (profilePicture) {
                                    // إذا كانت الصورة متاحة، أرسلها مع الرسالة
                                    await sock.sendMessage(senderJid, {
                                        image: { url: profilePicture },
                                        caption: replyText,
                                    }, { quoted: msg }); // استخدام { quoted: msg } للرد
                                } else {
                                    // إذا لم تكن الصورة متاحة، أرسل الرسالة فقط
                                    await sock.sendMessage(senderJid, {
                                        text: replyText,
                                    }, { quoted: msg });
                                }

                                console.log(`تم الرد تلقائيًا على ${senderNumber} بكلمة: "${keyword}"`);
                                break;
                            } catch (error) {
                                console.error(`خطأ في إرسال الرد التلقائي في ${senderJid}:`, error);
                            }
                        }
                    }
                }
            }
        });

        console.log('تم ربط مستمع الرد التلقائي المطور بنجاح.');
    }
};