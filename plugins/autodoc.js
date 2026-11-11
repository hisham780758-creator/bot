const fs = require('fs'); const path = require('path');

const imagePath = path.join(__dirname, '../image.jpeg'); const thumbnail = fs.readFileSync(imagePath);

module.exports = { command: 'autodoc', description: '⌯︙يضيف التوثيق لجميع الأوامر ويكمل الحقول الناقصة دون مسح الكود الأصلي', usage: '.autodoc', alias: ['auto-doc', 'توثيق'], category: 'tools', version: '4.0', hidden: false,

async execute(sock, msg, args) {
    try {
        const pluginsDir = path.join(__dirname, '.');
        const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js') && f !== 'autodoc.js');

        let updatedFiles = [];

        files.forEach(file => {
            const filePath = path.join(pluginsDir, file);
            let content = fs.readFileSync(filePath, 'utf-8');

            // التأكد من module.exports موجود
            const exportMatch = content.match(/module\.exports\s*=\s*{([\s\S]*?)};/);
            if (!exportMatch) return;

            let exportContent = exportMatch[1];
            let modified = false;
            const commandName = path.basename(file, '.js');

            // إضافة أو تعديل الحقول إذا ناقصة
            if (!/command\s*:/g.test(exportContent)) {
                exportContent = `\n    command: '${commandName}',` + exportContent;
                modified = true;
            }
            if (!/description\s*:/g.test(exportContent)) {
                exportContent = exportContent.replace(/command\s*:\s*['"].+?['"],/, match => match + `\n    description: 'وصف ${commandName}',`);
                modified = true;
            }
            if (!/usage\s*:/g.test(exportContent)) {
                exportContent = exportContent.replace(/description\s*:\s*['"].+?['"],/, match => match + `\n    usage: '.${commandName}',`);
                modified = true;
            }
            if (!/category\s*:/g.test(exportContent)) {
                exportContent = exportContent.replace(/usage\s*:\s*['"].+?['"],/, match => match + `\n    category: 'tools',`);
                modified = true;
            }

            if (modified) {
                const newContent = content.replace(exportMatch[0], `module.exports = {${exportContent}};`);
                fs.writeFileSync(filePath, newContent, 'utf-8');
                updatedFiles.push(file);
            }
        });

        let menu = '*˼‏❄️˹ تحديث التوثيق ⌯︙ جميع الأوامر*\n\n';
        if (updatedFiles.length === 0) {
            menu += '✅ كل الأوامر مكتملة التوثيق بالفعل.';
        } else {
            menu += updatedFiles.map(f => `✅ تم تحديث التوثيق لـ ${f}`).join('\n');
        }

        await sock.sendMessage(msg.key.remoteJid, { image: thumbnail, caption: menu }, { quoted: msg });
    } catch (error) {
        console.error('❌ Autodoc Error:', error);
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ حدث خطأ أثناء تحديث التوثيق. تأكد من وجود الملف image.jpeg في مجلد البوت.' }, { quoted: msg });
    }
}

};