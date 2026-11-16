const { isElite } = require('../haykala/elite');

module.exports = {
  command: 'اخرج',
  category: 'admin',
  description: 'يخرج البوت من المجموعة (للمطور فقط)',
  usage: '.اخرج بوت',

  async execute(sock, msg, args) {
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
          title: "𝐾 • S V2...",
          seconds: "99999",
          gifPlayback: true,
          caption: "s̷h̷a̷n̷k̷s̷⁖℘฿Ø₮",
          jpegThumbnail: Buffer.alloc(0)
        }
      }
    };

    const chatId = msg.key.remoteJid;

    if (!chatId.endsWith('@g.us')) {
      return sock.sendMessage(chatId, { text: '❌ هذا الأمر يعمل فقط في المجموعات.' }, { quoted: fakeOfficial });
    }

    const sender = msg.key.participant || msg.participant || msg.key.remoteJid;
    if (!isElite(sender)) {
      return sock.sendMessage(chatId, { text: '🚫 ليس لديك صلاحية لاستخدام هذا الأمر.' }, { quoted: fakeOfficial });
    }

    await sock.sendMessage(chatId, {
      text: '🤖 عمكم شانكس طفش منكم و امر ب الخروج سلام!',
    }, { quoted: fakeOfficial });

    await sock.groupLeave(chatId);
  }
};