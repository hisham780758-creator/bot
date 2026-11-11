const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// رسائل مزخرفة
const decorate = (text) => `❴✾❵──━━━━❨🍷❩━━━━──❴✾❵\n*${text}*\n❴✾❵──━━━━❨🍷❩━━━━──❴✾❵`;

module.exports = {
  category: 'tools',
  command: 'متحرك',
description: 'وصف ستكر-متحرك',
usage: '.ستكر-متحرك',
  async execute(sock, m) {
    try {
      const contextInfo = m.message?.extendedTextMessage?.contextInfo;
      const quoted = contextInfo?.quotedMessage;
      const image = quoted?.imageMessage;
      const video = quoted?.videoMessage;

      if (!quoted || (!image && !video)) {
        return await sock.sendMessage(m.key.remoteJid, {
          text: decorate('🖼️ يرجى الرد على صورة أو فيديو لتحويله إلى ستيكر.')
        }, { quoted: m });
      }

      const type = image ? 'image' : 'video';
      const content = image || video;
      const stream = await downloadContentFromMessage(content, type);

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      if (!buffer.length) {
        return await sock.sendMessage(m.key.remoteJid, {
          text: decorate('🍷 فشل تحميل الملف، حاول مجددًا.')
        }, { quoted: m });
      }

      const inputExt = type === 'image' ? 'jpg' : 'mp4';
      const inputPath = path.join(__dirname, `temp-input.${inputExt}`);
      const outputPath = path.join(__dirname, 'temp-output.webp');

      fs.writeFileSync(inputPath, buffer);

      // أمر ffmpeg
      let ffmpegCmd = '';

      if (type === 'image') {
        ffmpegCmd = `ffmpeg -y -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2,drawtext=text='KINGI':fontcolor=white:fontsize=24:x=w-text_w-10:y=h-text_h-10" -c:v libwebp -preset default -quality 100 -compression_level 6 -qscale 50 "${outputPath}"`;
      } else {
        ffmpegCmd = `ffmpeg -y -t 8 -i "${inputPath}" -vf "scale=320:-1,crop=320:320, fps=15, drawtext=text='KINGI':fontcolor=white:fontsize=20:x=w-text_w-10:y=h-text_h-10" -c:v libwebp -loop 0 -preset default -an -vsync 0 "${outputPath}"`;
      }

      console.log('FFmpeg command:', ffmpegCmd);

      exec(ffmpegCmd, async (error, stdout, stderr) => {
        if (error) {
          console.error('FFmpeg error:', error.message);
          console.error('FFmpeg stderr:', stderr);
          return await sock.sendMessage(m.key.remoteJid, {
            text: decorate('🍷 حدث خطأ أثناء تحويل الملف إلى ملصق.')
          }, { quoted: m });
        }

        if (!fs.existsSync(outputPath)) {
          return await sock.sendMessage(m.key.remoteJid, {
            text: decorate('🍷 تعذر إنشاء الملصق، حاول مجددًا أو استخدم ملف أصغر.')
          }, { quoted: m });
        }

        try {
          const webpBuffer = fs.readFileSync(outputPath);
          await sock.sendMessage(m.key.remoteJid, {
            sticker: webpBuffer
          }, { quoted: m });
        } catch (sendError) {
          console.error('Send error:', sendError);
          await sock.sendMessage(m.key.remoteJid, {
            text: decorate('🍷 حدث خطأ أثناء إرسال الملصق.')
          }, { quoted: m });
        }

        // حذف الملفات المؤقتة
        try {
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      });

    } catch (error) {
      console.error('Unhandled error:', error.message);
      await sock.sendMessage(m.key.remoteJid, {
        text: decorate('🍷 حدث خطأ أثناء المعالجة، حاول مجددًا.')
      }, { quoted: m });
    }
  }
};