module.exports = {
    command: 'حوله',
    description: 'تحويل جهة الاتصال المقتبس عنها إلى منشن',

    async execute(sock, msg) {
        try {
            const context =
                msg.message?.extendedTextMessage?.contextInfo;

            const quotedMessage = context?.quotedMessage;

            if (!quotedMessage?.contactMessage) {
                return;
            }

            const vcard = quotedMessage.contactMessage.vcard || '';

            const numbers = [
                ...vcard.matchAll(/TEL[^:]*:\s*([+\d][\d\s().-]*)/gi)
            ]
                .map(match => match[1].replace(/\D/g, ''))
                .filter(Boolean);

            if (!numbers.length) {
                return;
            }

            const mentions = numbers.map(number => `${number}@s.whatsapp.net`);

            const text = numbers
                .map(number => `@${number}`)
                .join('\n');

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text,
                    mentions
                },
                {
                    quoted: msg
                }
            );

        } catch (error) {
            console.error('❌ خطأ في أمر حوله:', error);
        }
    }
};