/ plugins/m.js
// أمر .m — للنخبة فقط — يرسل أغنية محفوظة من media/m-song.mp3

const fs = require('fs');
const path = require('path');
const { isElite } = require('../haykala/elite.js');

// مسار ملف الأغنية (عدّله لو غيرت اسم/مكان الملف)
const SONG_PATH = path.join(__dirname, '../media/z-song.mp3');

module.exports = {
  command: "z",
  description: "يرسل الأغنية المحفوظة (نخبة فقط).",
usage: '.z',
  category: "media",

  async execute(sock, msg, args, store) {
    const chatId    = msg.key.remoteJid;
    const senderJid = msg.participant || msg.key.participant || msg.key.remoteJid;

    try {
      // السماح للنخبة فقط
      if (!isElite(senderJid)) {
        return sock.sendMessage(chatId, {
          text: "🚫 هذا الأمر مخصص للنخبة فقط."
        }, { quoted: msg });
      }

      // التأكد من وجود ملف الأغنية
      if (!fs.existsSync(SONG_PATH)) {
        return sock.sendMessage(chatId, {
          text: "⚠️ لم أجد ملف الأغنية.\nضع الملف هنا:\nmedia/m-song.mp3\nثم أعد تشغيل البوت."
        }, { quoted: msg });
      }

      // قراءة الملف وإرساله كأغنية (ليس فويس)
      const audioBuffer = fs.readFileSync(SONG_PATH);
      await sock.sendMessage(chatId, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false, // true لو تبيها فويس نوت
        fileName: 'z-song.mp3',
        caption: '🎵 تشغيل — طلب النخبة'
      }, { quoted: msg });

    } catch (err) {
      console.error('m.js error:', err);
      await sock.sendMessage(chatId, {
        text: "❌ حدث خطأ أثناء إرسال الأغنية. تأكد من المسار وصلاحيات القراءة."
      }, { quoted: msg });
    }
  }
};