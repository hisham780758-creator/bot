const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  command: "بوت",
  description: "ردود عشوائية عند مناداة البوت",
  usage: ".بوت",
  category: "fun",

  async execute(sock, msg) {
    try {
      let imageBuffer = null;

      try {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const pfpUrl = await sock.profilePictureUrl(senderJid, "image");
        if (pfpUrl) {
          const res = await axios.get(pfpUrl, { responseType: "arraybuffer" });
          imageBuffer = Buffer.from(res.data, "binary");
        }
      } catch (e) {
        // تجاهل الخطأ لو فشل جلب صورة البروفايل
      }

      if (!imageBuffer) {
        const fallbackPath = path.join(process.cwd(), "image.jpg");
        if (fs.existsSync(fallbackPath)) {
          imageBuffer = fs.readFileSync(fallbackPath);
        }
      }

      // 5 ردود عشوائية عند مناداة "بوت"
      const replies = [
        "سِمًعٌآ وٌطِآعٌهّ 🪶"
      ];

      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      await sock.sendMessage(msg.key.remoteJid, {
        text: randomReply,
        contextInfo: {
          externalAdReply: {
            title: "نِداء البوت 🔊",
            body: "تم الرد على مناداة البوت",
            thumbnail: imageBuffer,
            mediaType: 1,
            sourceUrl: "https://t.me/Escanor_Bot_Channel",
            renderLargerThumbnail: false,
            showAdAttribution: true
          }
        }
      }, { quoted: msg });

    } catch (error) {
      console.error('❌ خطأ في أمر "بوت":', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `حدث خطأ أثناء تنفيذ الأمر:\n${error.message || error.toString()}`
      }, { quoted: msg });
    }
  }
};