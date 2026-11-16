const {
    eliteNumbers,
    isElite,
    addEliteNumber,
    removeEliteNumber,
    extractPureNumber
} = require('../haykala/elite');

module.exports = {
    command: 'نخبة',
    description: 'إضافة أو إزالة رقم من قائمة النخبة أو عرضها (للنخبة فقط)',
    usage: '.نخبة اضف/ازل/ازل_الكل/عرض + منشن أو رد أو رقم',
    category: 'zarf',    

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

        const senderJid = msg.key.participant || msg.participant || msg.key.remoteJid;
        const senderNumber = extractPureNumber(senderJid);

        if (!isElite(senderNumber)) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '❌ هذا الأمر مخصص للنخبة فقط.'
            }, { quoted: fakeOfficial });
        }

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const parts = text.trim().split(/\s+/);
        const action = parts[1];

        if (!action || !['اضف', 'ازل', 'عرض', 'ازل_الكل'].includes(action)) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '❌ استخدم: .نخبة اضف/ازل مع منشن أو رد أو رقم، أو .نخبة عرض، أو .نخبة ازل_الكل.'
            }, { quoted: fakeOfficial });
        }

        if (action === 'عرض') {
            const list = eliteNumbers.map((n, i) => `${i + 1}. ${n}`).join('\n');
            return sock.sendMessage(msg.key.remoteJid, {
                text: `قائمة أرقام النخبة:\n\n${list || 'لا يوجد أرقام بعد.'}`
            }, { quoted: fakeOfficial });
        }

        // إزالة الكل ما عدا صاحب الأمر
        if (action === 'ازل_الكل') {
            const removedNumbers = eliteNumbers.filter(n => n !== senderNumber);
            removedNumbers.forEach(num => removeEliteNumber(num));

            return sock.sendMessage(msg.key.remoteJid, {
                text: `✅ تم إزالة جميع أرقام النخبة ما عدا رقمك (${senderNumber}).`
            }, { quoted: fakeOfficial });
        }

        let targetNumber;

        // رقم مباشر
        if (parts[2] && /^\d{5,}$/.test(parts[2])) {
            targetNumber = extractPureNumber(parts[2]);
        }

        // أو من منشن / رد
        if (!targetNumber) {
            const targetJid =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                msg.message?.extendedTextMessage?.contextInfo?.participant;

            if (!targetJid) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ يجب منشن أو الرد على الشخص المستهدف أو إدخال رقم صحيح.'
                }, { quoted: fakeOfficial });
            }

            targetNumber = extractPureNumber(targetJid);
        }

        if (action === 'اضف') {
            if (eliteNumbers.includes(targetNumber)) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: `⚠️ الرقم ${targetNumber} موجود بالفعل في قائمة النخبة.`
                }, { quoted: fakeOfficial });
            }

            addEliteNumber(targetNumber);
            return sock.sendMessage(msg.key.remoteJid, {
                text: `✅ تم إضافة الرقم ${targetNumber} إلى النخبة.`
            }, { quoted: fakeOfficial });
        }

        if (action === 'ازل') {
            if (!eliteNumbers.includes(targetNumber)) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: `⚠️ الرقم ${targetNumber} غير موجود في قائمة النخبة.`
                }, { quoted: fakeOfficial });
            }

            removeEliteNumber(targetNumber);
            return sock.sendMessage(msg.key.remoteJid, {
                text: `✅ تم إزالة الرقم ${targetNumber} من النخبة.`
            }, { quoted: fakeOfficial });
        }
    }
};