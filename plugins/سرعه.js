const fs = require('fs');

module.exports = {
  command: ['.سرعه'],
  description: 'حساب سرعة استجابة البوت (Latency) بوحدة الثواني',
usage: '.سرعه',
  category: 'أدوات',

  async execute(sock, msg, args = []) {
    try {
      // قراءة النص الكامل من الرسالة (لو حبيت تستخدم لاحقًا)
      const fullText =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      const start = Date.now(); // تسجيل الوقت عند إرسال الرسالة

      // إرسال رسالة البداية  
      const response = await sock.sendMessage(msg.key.remoteJid, {
        text: '_*جــــاري حـــساب ســـرعه البوت..... 🌙*_'
      }, { quoted: msg });

      const end = Date.now(); // تسجيل الوقت عند استلام الرد  
      const pingSeconds = ((end - start) / 1000).toFixed(2); // تحويل إلى ثوانٍ بدقة منزلتين عشريتين  

      // تنسيق نص النتيجة  
      const resultText = `*ســـرعه الانــترنت عـــند الـــبوت حالــيا هــي ${pingSeconds} ثانية🔥*`;

      // قراءة الصورة المصغرة
      const imagePath = "image.jpeg";
      const hasImage = fs.existsSync(imagePath);
      const imageBuffer = hasImage ? fs.readFileSync(imagePath) : null;

      // إرسال النتيجة مع صورة مصغرة ورابط
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: resultText,
          contextInfo: {
            externalAdReply: {
              title: "𝐒𝐀𝐍𝐉𝐈 BOT ⚡",
              body: "تم حساب سرعة البوت بنجاح 🎉",
              thumbnail: imageBuffer,
              mediaType: 1,
              sourceUrl: "https://t.me/Sanji_Bot_Channel",
              renderLargerThumbnail: false,
              showAdAttribution: true
            }
          }
        },
        { quoted: response }
      );

    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `⚠️ حدث خطأ: ${err.message || err.toString()}`,
      }, { quoted: msg });
    }
  }
};