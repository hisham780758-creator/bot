const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '..', 'db');
const dbFile = path.join(dbDir, 'marriages.json');

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, '{}');

const couplesEmojis = ['💑', '👩‍❤️‍👨', '💕', '💞', '💖', '💘'];

function loadMarriages() {
  try {
    return JSON.parse(fs.readFileSync(dbFile));
  } catch {
    return {};
  }
}

function getRandomEmoji() {
  return couplesEmojis[Math.floor(Math.random() * couplesEmojis.length)];
}

module.exports = {
  command: ['زوج'],
  description: 'عرض الزيجات المسجلة بشكل منسق وجميل',
  usage: '.زوج عرض',
  category: 'مرح',

  async execute(sock, msg) {
    const args = msg.args || [];
    const chatId = msg.key.remoteJid;

    if (args.length === 0 || args[0].toLowerCase() !== 'عرض') {
      await sock.sendMessage(chatId, {
        text: '⚠️ يرجى كتابة الأمر بشكل صحيح:\n.زوج عرض',
      }, { quoted: msg });
      return;
    }

    const marriages = loadMarriages();
    const entries = Object.entries(marriages);

    if (entries.length === 0) {
      await sock.sendMessage(chatId, {
        text: '❌ لا توجد زيجات مسجلة حالياً.',
      }, { quoted: msg });
      return;
    }

    const displayed = new Set();
    let text = `💞✨ *قائمة الزيجات المسجلة* ✨💞\n\nعدد الزيجات: ${entries.length}\n\n`;

    for (const [partner1, value] of entries) {
      // تأكد من أن value مصفوفة بها عنصرين على الأقل
      if (!Array.isArray(value) || value.length < 2) continue;

      const [name1, partner2] = value;

      // تأكد من أن الطرفين معرفين
      if (!partner1 || !partner2) continue;
      if (displayed.has(partner1) || displayed.has(partner2)) continue;

      const emoji = getRandomEmoji();
      text += `${emoji}  *@${partner1.split('@')[0]}*  ❤️  *@${partner2.split('@')[0]}*\n`;
      text += '─────────────────\n';
      displayed.add(partner1);
      displayed.add(partner2);
    }

    text += `\n🌹 نتمنى للجميع حياة مليئة بالحب والسعادة 🌹`;

    await sock.sendMessage(chatId, {
      text,
      mentions: Array.from(displayed),
    }, { quoted: msg });
  }
};