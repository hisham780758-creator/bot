const { getProfilePicture } = require("@whiskeysockets/baileys");

module.exports = {
  command: "سونغ",
  description: "رد تلقائي على كلمة شغال",
  usage: ".شغال",
  category: "fun",

  async execute(sock, msg) {
    try {
      const replies = [
        "تحت امرك أيها الملك 👑"
      ];

      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const senderId = msg.key.participant || msg.key.remoteJid;

      let pfp = null;
      try {
        pfp = await sock.profilePictureUrl(senderId, 'image');
      } catch {}

      await sock.sendMessage(msg.key.remoteJid, {
        text: randomReply,
        contextInfo: {
          externalAdReply: {
            title: "🟢 شغال تمام",
            body: "رد تلقائي من 𝑺𝑶𝑵𝑮 『🪶』",
            thumbnailUrl: pfp,
            mediaType: 1,
            renderLargerThumbnail: false,
            showAdAttribution: false
          }
        }
      }, { quoted: msg });

    } catch (error) {
      console.error("❌ خطأ في أمر 'شغال':", error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ حصل خطأ:\n${error.message || error.toString()}`
      }, { quoted: msg });
    }
  }
};