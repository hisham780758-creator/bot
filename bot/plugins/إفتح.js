/**
 * 👑 أمر: إفتح
 * 📜 الوصف: فتح المجموعة والسماح للأعضاء بإرسال الرسائل
 * 💡 الاستخدام: .فتح
 * 🏷️ التصنيف: special
 */

const { eliteNumbers } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

/**
 * 🔹 دالة فك ترميز JID
 * @param {string} jid - معرف الشخص أو المجموعة
 * @returns {string} - JID صالح للإرسال
 */
const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'إفتح',
    description: 'فتح المجموعة والسماح للأعضاء بإرسال الرسائل',
    usage: '.فتح',
    category: 'special',

    /**
     * تنفيذ الأمر
     * @param {object} sock - جلسة البوت
     * @param {object} msg - الرسالة الواردة
     * @param {array} args - مصفوفة المعطيات الإضافية (إن وجدت)
     */
    async execute(sock, msg, args) {
        const groupJid = msg.key.remoteJid;
        const sender = decode(msg.key.participant || groupJid);
        const senderLid = sender.split('@')[0];

        // التوثيق الوهمي
        const fakeOfficial = {
            key: {
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "120363025246999999@g.us",
                id: "BAE5F7C88C7D8A3D3F1A3A",
            },
            message: {
                videoMessage: {
                    title: "S • S V2...",
                    seconds: "99999",
                    gifPlayback: true,
                    caption: "s̷h̷a̷n̷k̷s̷⁖℘฿Ø₮",
                    jpegThumbnail: Buffer.alloc(0)
                }
            }
        };

        try {
            // التحقق من أن الأمر داخل مجموعة
            if (!groupJid.endsWith('@g.us')) {
                return await sock.sendMessage(groupJid, { text: '❗ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: fakeOfficial });
            }

            // التحقق من صلاحية المستخدم
            if (!eliteNumbers.includes(senderLid)) {
                return await sock.sendMessage(groupJid, { text: '❗ لا تملك صلاحية استخدام هذا الأمر.' }, { quoted: fakeOfficial });
            }

            // فتح المجموعة: السماح للجميع بإرسال الرسائل
            await sock.groupSettingUpdate(groupJid, 'not_announcement');

            // إرسال رسالة تأكيد بعد الفتح
            await sock.sendMessage(groupJid, {
                text: '*تـم فـتــح الــقــروب بــي نــجــاح  ⁽🍷₎*'
            }, { quoted: fakeOfficial });

        } catch (error) {
            // التعامل مع الأخطاء وإرسال رسالة للمستخدم
            console.error('❌ خطأ في أمر فتح:', error);
            await sock.sendMessage(groupJid, {
                text: `❌ حدث خطأ أثناء تنفيذ الأمر:\n\n${error.message || error.toString()}`
            }, { quoted: fakeOfficial });
        }
    },
};