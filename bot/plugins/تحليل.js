const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fileType = require('file-type'); // تعديل هنا
const { jidDecode, downloadContentFromMessage } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid?.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
  command: ['تحليل'],
  description: 'استخراج النص من صورة، ملف PDF، أو تسجيل صوتي.',
  usage: '.تحليل ← رد على ملف',
  category: 'tools',

  async execute(sock, msg, args) {
    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      const fileMessage = quoted?.imageMessage ||
                          quoted?.documentMessage ||
                          quoted?.audioMessage ||
                          quoted?.videoMessage;

      if (!fileMessage) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: `📌 يرجى الرد على صورة أو تسجيل صوتي أو ملف PDF.\nمثال: .تحليل ← ورد على الملف`,
        }, { quoted: msg });
      }

      const type = quoted.imageMessage ? 'image' :
                   quoted.documentMessage ? 'document' :
                   quoted.audioMessage ? 'audio' :
                   quoted.videoMessage ? 'video' : null;

      if (!type) {
        throw new Error('⚠️ نوع الملف غير مدعوم أو غير معروف.');
      }

      const stream = await downloadContentFromMessage(fileMessage, type);
      const bufferArray = [];
      for await (const chunk of stream) bufferArray.push(chunk);
      const buffer = Buffer.concat(bufferArray);

      const fileInfo = await fileType.fromBuffer(buffer); // تعديل هنا
      if (!fileInfo?.ext) throw new Error('❌ نوع الملف غير مدعوم أو غير معروف.');

      const url = await uploadToCatbox(buffer, fileInfo.ext);
      const resultText = await extractTextFromMedia(url, fileInfo.mime);

      await sock.sendMessage(msg.key.remoteJid, {
        text: resultText || '❗ لم يتم العثور على نص في الملف.',
      }, { quoted: msg });

    } catch (err) {
      console.error('✗ خطأ في أمر التحليل:', err);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `⚠️ حدث خطأ أثناء التحليل:\n${err.message || err.toString()}`,
      }, { quoted: msg });
    }
  }
};

// رفع الملف إلى Catbox
const uploadToCatbox = async (buffer, ext) => {
  const form = new FormData();
  form.append('fileToUpload', buffer, `file.${ext}`);
  form.append('reqtype', 'fileupload');

  try {
    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form,
    });
    const url = await res.text();
    if (!url.startsWith('https://')) throw new Error('فشل في رفع الملف: ' + url);
    return url;
  } catch (error) {
    throw new Error(`فشل في رفع الملف: ${error.message}`);
  }
};

// استخراج النص من الملف المرفوع
const extractTextFromMedia = async (url, mime) => {
  try {
    const apiUrl = `https://the-end-api.vercel.app/home/sections/Ai/api/convert?url=${encodeURIComponent(url)}&mime=${encodeURIComponent(mime)}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`استجابة خاطئة من الخادم: ${res.status}`);
    const data = await res.json();
    return data.message || 'لم يتم العثور على نص.';
  } catch (error) {
    throw new Error(`فشل في استخراج النص: ${error.message}`);
  }
};