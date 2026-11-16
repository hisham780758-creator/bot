// ═══════════════════════════════════════════════════
// plugins/مراقبة.js — أمر الفحص اليدوي
// ═══════════════════════════════════════════════════

const { runScan } = require('../handlers/periodic');

module.exports = {
    command: 'مراقبة',
    description: 'بدء جولة فحص شاملة لجميع المجموعات يدوياً',
    usage: '.مراقبة',
    category: 'tools',

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        await sock.sendMessage(jid, {
            text: '🔍 **جاري بدء جولة فحص الأجهزة في جميع المجموعات...**'
        }, { quoted: msg });

        const result = await runScan(sock);

        if (result === -1) {
            await sock.sendMessage(jid, { text: '❌ حدث خطأ أثناء تنفيذ الفحص.' }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, {
                text: `✅ **تمت جولة الفحص بنجاح في كل المجموعات!**\nعدد الأجهزة الجديدة المكتشفة: ${result}`
            }, { quoted: msg });
        }
    }
};
