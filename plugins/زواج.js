const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '..', 'db');
const dbFile = path.join(dbDir, 'marriages.json');

// إنشاء المجلد والملف إذا ما موجودين
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, '{}');

function loadMarriages() {
  try {
    return JSON.parse(fs.readFileSync(dbFile));
  } catch {
    return {};
  }
}

function saveMarriages(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

module.exports = {
  command: ['زواجج'],
  category: 'مرح',
  description: 'تزويج شخص عبر الرد أو منشن أو رقم',
  usage: '.زواج (رد أو منشن أو رقم)',

  async execute(sock, msg, args = []) {
    // الحصول على رقم المرسل بشكل موثوق
    const sender = msg.sender || msg.key.participant || msg.key.remoteJid || '';
    const chatId = msg.key.remoteJid;

    const marriages = loadMarriages();

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo || {};
    const mentionedJid = contextInfo.mentionedJid || [];
    const quotedParticipant = contextInfo.participant;

    let target = null;

    if (mentionedJid.length > 0) {
      target = mentionedJid[0];
    } else if (quotedParticipant) {
      target = quotedParticipant;
    } else if (args.length > 0) {
      const number = args[0].replace(/\D/g, '');
      if (number) {
        target = number + '@s.whatsapp.net';
      }
    }

    if (!target) {
      await sock.sendMessage(chatId, {
        text: '👰‍♀️ يرجى الرد على رسالة شخص أو منشنه أو كتابة رقمه بعد الأمر.',
      }, { quoted: msg });
      return;
    }

    if (target === sender) {
      await sock.sendMessage(chatId, {
        text: '🤦‍♂️ لا يمكنك الزواج من نفسك.',
      }, { quoted: msg });
      return;
    }

    // تحقق إذا أحد الطرفين متزوج مسبقًا
    const isTaken = Object.values(marriages).some(pair => pair.includes(sender) || pair.includes(target));
    if (isTaken) {
      await sock.sendMessage(chatId, {
        text: '💔 أحد الطرفين متزوج بالفعل، الرجاء الطلاق أولاً.',
      }, { quoted: msg });
      return;
    }

    // حفظ الزواج
    marriages[sender] = [sender, target];
    saveMarriages(marriages);

    // إرسال رسالة الزواج المنسقة
    await sock.sendMessage(chatId, {
      text: `
💞🌟 *✨ مبروك الزواج ✨* 🌟💞

╔═══════════════╗
👰 *الزوجة:* @${target.split('@')[0]}
🤵 *الزوج:* @${sender.split('@')[0]}
╚═══════════════╝

❤️ *نتمنى لكم حياة مليئة بالحب والسعادة والوفاق.* ❤️

🌹 *بارك الله لكما وبارك عليكما وجمع بينكما في خير.* 🌹
      `,
      mentions: [sender, target]
    }, { quoted: msg });
  }
};