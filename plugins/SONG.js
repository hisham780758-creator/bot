const fs = require('fs');
const path = require('path');

module.exports = {
    command: 'SONG',
    description: 'إرسال فيديو دائري عشوائي 🍷',
    category: 'ترفيه',

    async execute(sock, msg) {
        const chatId = msg.key.remoteJid;

        try {
            const videosDir = '/sdcard/.bot/bot/videos';

            if (!fs.existsSync(videosDir)) {
                return sock.sendMessage(chatId, {
                    text: '❌ مجلد videos غير موجود.'
                }, { quoted: msg });
            }

            const files = fs.readdirSync(videosDir).filter(file => {
                const ext = path.extname(file).toLowerCase();

                return [
                    '.mp4',
                    '.mkv',
                    '.mov',
                    '.webm',
                    '.avi'
                ].includes(ext);
            });

            if (files.length === 0) {
                return sock.sendMessage(chatId, {
                    text: '❌ ما لقيت أي فيديو داخل مجلد videos.'
                }, { quoted: msg });
            }

            const randomFile =
                files[Math.floor(Math.random() * files.length)];

            const videoPath =
                path.join(videosDir, randomFile);

            const videoBuffer =
                fs.readFileSync(videoPath);

            await sock.sendMessage(chatId, {
                video: videoBuffer,
                ptv: true
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ خطأ في أمر 🍷:', error);

            await sock.sendMessage(chatId, {
                text: `❌ حدث خطأ:\n${error.message}`
            }, { quoted: msg });
        }
    }
};
