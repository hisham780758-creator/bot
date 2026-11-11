module.exports = {
  command: "المشرفين",
  description: "👥 منشن جميع المشرفين في المجموعة.",
  usage: ".المشرفين",
category: 'tools',

  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;

    // تأكد إن الأمر داخل جروب
    if (!chatId.endsWith("@g.us")) {
      return sock.sendMessage(chatId, {
        text: "❌ هذا الأمر يعمل فقط في المجموعات."
      }, { quoted: msg });
    }

    // الحصول على معلومات الجروب
    const metadata = await sock.groupMetadata(chatId);
    const admins = metadata.participants.filter(p => p.admin);

    if (admins.length === 0) {
      return sock.sendMessage(chatId, {
        text: "⚠️ لا يوجد مشرفين في هذه المجموعة!"
      }, { quoted: msg });
    }

    // تجهيز المنشن
    const mentions = admins.map(a => a.id);
    const namesList = admins.map((a, i) => `${i + 1}- @${a.id.split("@")[0]}`).join('\n');

    await sock.sendMessage(chatId, {
      text: `╭──🎖️ *منشن المشرفين* 🎖️──╮
  
${namesList}

╰━━━ 𝐇𝐔𝐍𝐓𝐄𝐑𝐒 ━━━╯`,
      mentions
    }, { quoted: msg });
  }
};