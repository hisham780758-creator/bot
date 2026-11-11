const fs = require('fs');
const path = require('path');

module.exports = {
    command: 'شغال',
    description: 'اختبار البوت',
    usage: '.شغال',
    category: 'tools',

    async execute(sock, msg) {
        try {
            const decoratedText = `✧🧭❯ تحت الخدمه`;

            const imagePath = path.join(__dirname, '../media/imagex.jpeg');
            const hasImage = fs.existsSync(imagePath);
            const imageBuffer = hasImage ? fs.readFileSync(imagePath) : null;

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: decoratedText,
                    contextInfo: {
                        externalAdReply: {
                            title: " 𝑺𝑯𝑨𝑹𝑳𝑼𝑲 『⚕️』",
                            body: "𝑺𝑬𝑹𝑽𝑬𝑹 𝑼𝑵𝑪𝑳𝑬...",
                            thumbnail: imageBuffer,
                            mediaType: 1,
                            sourceUrl: "wa.me/+201065826587",
                            renderLargerThumbnail: false,
                            showAdAttribution: true
                        }
                    },
                    mentions: [msg.sender]
                },
                { quoted: msg }
            );

        } catch (error) {
            console.error('❌ خطأ في تنفيذ:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ حدث خطأ: ${error.message || error.toString()}`
            }, { quoted: msg });
        }
    } 
};