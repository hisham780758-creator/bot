module.exports = {
    command: 'سونغ',
    description: 'اختبار البوت',
    usage: '.test',
    category: 'tools',    
    
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
                    title: "𝑆 • 𝐾 V2...",
                    seconds: "99999",
                    gifPlayback: true,
                    caption: "𝑺𝑶𝑵𝑮̷⁖℘฿Ø₮",
                    jpegThumbnail: Buffer.alloc(0)
                }
            }
        };

        try {
            // التحقق من القيم
            const chatId = msg?.key?.remoteJid;
            const sender = msg?.sender;

            if (!chatId) {
                console.error('❌ لا يوجد chatId صالح في الرسالة.');
                return;
            }

            const decoratedText = `
*👑 𝐼 𝐴𝑀 𝐻𝐸𝑅𝐸 • 𝐾𝐼𝑁𝐺 𝑺𝑶𝑵𝑮̷ 🪶🔥*`;

            await sock.sendMessage(chatId, {
                text: decoratedText,
                mentions: sender ? [sender] : []
            }, { quoted: fakeOfficial });

        } catch (error) {
            console.error('❌ Error executing test:', error);

            const chatId = msg?.key?.remoteJid;
            if (chatId) {
                await sock.sendMessage(chatId, {
                    text: `❌ حدث خطأ أثناء تنفيذ الأمر:\n${error.message || error.toString()}`
                }, { quoted: fakeOfficial });
            }
        }
    }
};