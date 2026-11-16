module.exports = {
    command: 'test',
    desc: 'اختبار البوت',
    
    async execute(sock, message, args) {
        await sock.sendMessage(message.chat, {
            text: '✅ البوت شغال!'
        });
    }
};
