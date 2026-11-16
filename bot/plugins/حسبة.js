const { processGuildCalculation } = require('../handlers/Calculation');

module.exports = {
    command: ['حسبة'],
    description: 'حسبة تفاعل جميع النقابات الأساسية',
    category: 'admin',

    async execute(sock, msg) {
        try {
            const messageText =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                '';

            const args = messageText.trim().split(/\s+/).slice(1);
            const period = args[0] || 'اليوم';

            await processGuildCalculation(sock, msg, period);
        } catch (err) {
            console.error('❌ خطأ في تنفيذ أمر حسبة:', err);
        }
    }
};
