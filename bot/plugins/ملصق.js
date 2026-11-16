const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: 'ملصق',
  description: 'يحوّل صورة إلى ملصق بحقوقك.',
usage: '.ملصق',
  category: 'special',

  async execute(sock, m, args) {
    try {
      const contextInfo = m.message?.extendedTextMessage?.contextInfo;
      const chatId = m.key.remoteJid;

      if (!contextInfo || !contextInfo.quotedMessage || !contextInfo.quotedMessage.imageMessage) {
        return await sock.sendMessage(chatId, {
          text: '⚠️ يرجى الرد على صورة لتحويلها إلى ستيكر.'
        }, { quoted: m });
      }

      const quotedMsg = contextInfo.quotedMessage.imageMessage;
      const stream = await downloadContentFromMessage(quotedMsg, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      if (!buffer.length) {
        return await sock.sendMessage(chatId, {
          text: '⚠️ فشل تحميل الصورة، حاول مجددًا.'
        }, { quoted: m });
      }

      const inputPath = path.join(process.cwd(), 'temp-input.jpg');
      const outputPath = path.join(process.cwd(), 'temp-output.webp');

      fs.writeFileSync(inputPath, buffer);

      exec(`ffmpeg -i ${inputPath} -vf "scale=512:512:force_original_aspect_ratio=decrease" -c:v libwebp -preset default -quality 100 -compression_level 6 -qscale 50 ${outputPath}`, async (error) => {
        if (error) {
          console.error('FFmpeg error:', error);
          return await sock.sendMessage(chatId, {
            text: '❌ حدث خطأ أثناء تحويل الصورة.'
          }, { quoted: m });
        }

        try {
          const webpBuffer = fs.readFileSync(outputPath);

          // تفاعل على رسالة المستدعي
          await sock.sendMessage(chatId, {
            react: {
              text: '🍁',
              key: m.key
            }
          });

          // إرسال الملصق مع الحقوق
          const sentStickerMsg = await sock.sendMessage(chatId, {
            sticker: webpBuffer,
            packname: "asca(🔱) DRK", // الحقوق
            author: "By Ascanor"      // الوصف
          }, { quoted: m });

          // تفاعل على الملصق المرسل
          await sock.sendMessage(chatId, {
            react: {
              text: '🌟',
              key: sentStickerMsg.key
            }
          });

        } catch (sendError) {
          console.error('Send error:', sendError);
          await sock.sendMessage(chatId, {
            text: '❌ حدث خطأ أثناء إرسال الملصق.'
          }, { quoted: m });
        }

        try {
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      });

    } catch (error) {
      console.error('Error in sticker command:', error);
      await sock.sendMessage(m.key.remoteJid, {
        text: '❌ حدث خطأ أثناء معالجة الصورة، حاول مجددًا.'
      }, { quoted: m });
    }
  }
};

