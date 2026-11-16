const { isElite } = require('../haykala/elite');

module.exports = {
    command: 'سباام',
    category: 'ادارة',
    description: 'يرسل رسالة مكررة لرقم معين حسب العدد المطلوب (بصيغة 50/كلمة/رقم)',
usage: '.spam',

    async execute(sock, msg, args = []) {
        const { remoteJid } = msg.key;
        const sender = msg.key.participant || msg.key.remoteJid;

        if (!(await isElite(sender))) {
            return sock.sendMessage(remoteJid, {
                text: '❌ هذا الأمر مخصص للنخبة فقط.'
            }, { quoted: msg });
        }

        try {
            const messageText = msg.message?.conversation ||
                                msg.message?.extendedTextMessage?.text ||
                                msg.message?.imageMessage?.caption ||
                                msg.message?.videoMessage?.caption;

            if (!messageText || !messageText.includes('/')) {
                return sock.sendMessage(remoteJid, {
                    text: '⚠️ الصيغة الصحيحة:\n.سبام 50/كلمة/رقم_واتساب',
                }, { quoted: msg });
            }

            const [_, data] = messageText.split('.سبام');
            const [countStr, spamText, numberRaw] = data.trim().split('/');

            const count = parseInt(countStr);
            if (!count || !spamText || !numberRaw.match(/^\d{6,}$/)) {
                return sock.sendMessage(remoteJid, {
                    text: '❌ تحقق من أن الصيغة كالتالي:\n.سبام 10/رسالة/212xxxxxxxx',
                }, { quoted: msg });
            }

            const targetNumber = numberRaw + '@s.whatsapp.net';

            for (let i = 0; i < count; i++) {
                await sock.sendMessage(targetNumber, { text: spamText });
                await new Promise(res => setTimeout(res, 1500));
            }

            return sock.sendMessage(remoteJid, {
                text: `✅ تم إرسال "${spamText}" عدد ${count} مرة إلى ${numberRaw}`,
            }, { quoted: msg });

        } catch (error) {
            console.error('🚫 خطأ في أمر السبام:', error);
            return sock.sendMessage(remoteJid, {
                text: '❌ حدث خطأ أثناء تنفيذ الأمر. حاول لاحقًا.',
            }, { quoted: msg });
        }
    }
};