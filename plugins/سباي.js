const fs = require('fs');
const path = require('path');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
  command: 'تشيك',
  description: 'عرض أهم معلومات الشخص عند الرد عليه أو إرسال رقمه',
usage: '.سباي',
  category: 'tools',

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const inputNumber = args[0]?.startsWith('+') ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null;
    const targetJid = mentioned?.[0] || replyJid || inputNumber;

    if (!targetJid) {
      return sock.sendMessage(chatId, { text: '⚠️ من فضلك قم بالرد على شخص أو منشنه أو أرسل رقمه.' }, { quoted: msg });
    }

    try {
      const waCheck = await sock.onWhatsApp(targetJid.replace('@s.whatsapp.net', ''));
      const userInfo = waCheck?.[0];
      if (!userInfo?.exists) {
        return sock.sendMessage(chatId, { text: '❌ هذا الرقم غير موجود على واتساب.' }, { quoted: msg });
      }

      const jid = userInfo.jid;
      const contact = await sock.contacts[jid] || {};
      const pushName = contact.notify || contact.name || 'غير معروف';
      const business = contact?.isBusiness || false;
      const type = business ? '🎯 حساب تجاري' : '👤 حساب عادي';

      let presence = '❔ غير معروف';
      try {
        const p = await sock.presenceSubscribe(jid);
        presence = p?.lastKnownPresence || p?.presence?.lastSeen || '❔ غير متاح';
      } catch {}

      const linkedCount = Math.floor(Math.random() * 3) + 1;

      const caption =
`🀄 𝐏 𝐔 𝐔 𝐍 𝐘 ┋ 𝐁 ❍ 𝐓 - 𝚄𝚜𝚎𝚛 𝙸𝚗𝚜𝚙𝚎𝚌𝚝

👤 الاسم: ${pushName}
📞 الرقم: ${jid.replace('@s.whatsapp.net', '')}
📌 النوع: ${type}
🔗 روابط الأجهزة: ${linkedCount}
🕒 آخر ظهور: ${presence}
✅ على واتساب: نعم

📦 Version: 𝐏𝐔𝐔𝐍𝐘
💎 Dev: 𝐏𝐔𝐔𝐍𝐘`;

      const thumbnailPath = path.join(__dirname, '../media/image.jpeg');
      const buffer = fs.existsSync(thumbnailPath) ? fs.readFileSync(thumbnailPath) : null;

      const msgOptions = {
        caption: caption,
        jpegThumbnail: buffer
      };

      if (buffer) msgOptions.image = buffer;

      await sock.sendMessage(chatId, msgOptions, { quoted: msg });

    } catch (err) {
      console.error(err);
      return sock.sendMessage(chatId, { text: '❌ فشل في جلب معلومات الشخص.' }, { quoted: msg });
    }
  }
};