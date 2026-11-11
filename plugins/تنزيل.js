const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { default: axiosDefault } = require('axios');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

module.exports = {
  command: ['تنزيل'],
  description: 'تنزيل صور من Pinterest حسب كلمة البحث.',
  usage: 'تنزيل <كلمة البحث>',
  category: 'tools',

  async execute(sock, msg) {
    const fullText =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';

    const inputText = fullText.replace(/^([،.\/!#])?تنزيل\s*/i, '').trim();

    if (!inputText) {
      return await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ اكتب كلمة أبحث عنها بعد "تنزيل"',
      }, { quoted: msg });
    }

    const searchQuery = inputText;
    const numberOfImages = 10; // تلقائي 10 صور

    // 🔀 كلمات عشوائية لتحسين التنويع
    const extras = ['aesthetic', '2024', 'hd', 'portrait', 'fanart', 'inspo', 'wallpaper'];
    const randomWord = extras[Math.floor(Math.random() * extras.length)];

    // 🔍 رابط البحث مع random param لتغيير النتيجة
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(`${searchQuery} ${randomWord} site:pinterest.com`)}&tsc=ImageBasicHover&form=IRFLTR&random=${Date.now()}`;

    try {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `📥 جاري تنزيل 10 صور لـ *${searchQuery}* ...`,
      }, { quoted: msg });

      const { data } = await axios.get(searchUrl);
      const $ = cheerio.load(data);
      const imageUrls = [];

      $('a.iusc').each((i, el) => {
        const m = $(el).attr('m');
        try {
          const json = JSON.parse(m);
          if (json.murl) imageUrls.push(json.murl);
        } catch {}
      });

      if (imageUrls.length === 0) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ لم يتم العثور على صور.',
        }, { quoted: msg });
      }

      const imagesToSend = imageUrls.slice(0, numberOfImages);

      for (const [index, imgUrl] of imagesToSend.entries()) {
        try {
          const filePath = path.join(__dirname, `dl-${Date.now()}-${index}.jpg`);
          const response = await axiosDefault({
            url: imgUrl,
            method: 'GET',
            responseType: 'stream'
          });

          await streamPipeline(response.data, fs.createWriteStream(filePath));

          const buffer = fs.readFileSync(filePath);
          await sock.sendMessage(msg.key.remoteJid, {
            image: buffer,
            caption: `📸 صورة ${index + 1} من "${searchQuery}"`,
          }, { quoted: msg });

          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`❌ خطأ في صورة ${index + 1}:`, err);
        }
      }

    } catch (err) {
      console.error('❌ خطأ أثناء البحث:', err);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ حدث خطأ أثناء التنزيل.',
      }, { quoted: msg });
    }
  }
};