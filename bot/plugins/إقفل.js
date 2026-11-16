const { eliteNumbers } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'اقفل',
    description: 'قفل المجموعة ومنع الأعضاء من إرسال الرسائل',
    usage: '.قفل',
    category: 'special',

    async execute(sock, msg) {
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
            const groupJid = msg.key.remoteJid;
            const sender = decode(msg.key.participant || groupJid);
            const senderLid = sender.split('@')[0];

            if (!groupJid.endsWith('@g.us'))
                return await sock.sendMessage(groupJid, { text: '❗ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: fakeOfficial });

            if (!eliteNumbers.includes(senderLid))
                return await sock.sendMessage(groupJid, { text: '❗ لا تملك صلاحية استخدام هذا الأمر.' }, { quoted: fakeOfficial });

            // قفل المجموعة: السماح فقط للمشرفين بإرسال الرسائل
            await sock.groupSettingUpdate(groupJid, 'announcement');

            // إرسال رسالة بعد القفل
            await sock.sendMessage(groupJid, {
                text: '*تـم إقـفــال الــشــات بــي نــجــاح يــاحــب  ⁽🍷₎*'
            }, { quoted: fakeOfficial });

        } catch (error) {
            console.error('❌ خطأ في أمر قفل:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ حدث خطأ أثناء تنفيذ الأمر:\n\n${error.message || error.toString()}`
            }, { quoted: fakeOfficial });
        }
    }
};