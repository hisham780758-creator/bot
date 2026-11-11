const fs = require('fs');
const path = require('path');

module.exports = {
    command: 'نظف',
    description: 'حذف الملفات المتكررة في مجلد الجلسة دون فقدان الاتصال',
    usage: '.تنظيف',
category: 'tools',

    async execute(sock, msg) {
        try {
            const sessionFolder = path.join(process.cwd(), 'ملف_الاتصال');
            const maxFiles = 50;

            if (!fs.existsSync(sessionFolder)) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '⚠️ مجلد الجلسة غير موجود!'
                }, { quoted: msg });
            }

            const files = fs.readdirSync(sessionFolder)
                .map(file => ({
                    name: file,
                    time: fs.statSync(path.join(sessionFolder, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            if (files.length <= maxFiles) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: `✅ لا حاجة للتنظيف! يوجد ${files.length} ملفًا فقط.`
                }, { quoted: msg });
            }

            const filesToDelete = files.slice(maxFiles);
            filesToDelete.forEach(file => {
                fs.unlinkSync(path.join(sessionFolder, file.name));
            });

            const message = `🧹 *تم حذف ${filesToDelete.length} ملف قديم!*`;
            await sock.sendMessage(msg.key.remoteJid, {
                text: message
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ خطأ أثناء تنظيف الجلسة:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ حدث خطأ أثناء محاولة تنظيف الجلسة.'
            }, { quoted: msg });
        }
    }
};