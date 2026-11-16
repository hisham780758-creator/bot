module.exports = {
  command: 'ذكوره',
  description: '🧔 نسبة الذكورة لك أو لصديقك',
  usage: '.ذكوره [منشن]',
  category: 'ترفيه',

  async execute(sock, msg) {
    let targetJid;

    if (
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid &&
      msg.message.extendedTextMessage.contextInfo.mentionedJid.length > 0
    ) {
      // تم منشن شخص
      targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else {
      // مفيش منشن، استخدم اللي بعت الرسالة
      targetJid = msg.key.participant || msg.key.remoteJid;
    }

    const percentage = Math.floor(Math.random() * 101);
    const targetId = targetJid.split('@')[0];

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🧔‍♂️ نسبة الذكورة لـ *@${targetId}*: *${percentage}%*\n\n💪 الرجولة على أصولها ولا لأ؟`,
      mentions: [targetJid]
    }, { quoted: msg });
  }
};