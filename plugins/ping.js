export default {
    command: 'ping',
    desc: 'سرعة البوت',
    
    async execute(sock, message, args) {
        const start = Date.now();
        await sock.sendMessage(message.chat, { text: '🏓 جاري الاختبار...' });
        const end = Date.now();
        await sock.sendMessage(message.chat, { 
            text: `🏓 السرعة: ${end - start}ms` 
        });
    }
};
