const { getPlugins } = require('../handlers/plugins.js');
const fs = require('fs');
const path = require('path');

const imagePath = path.join(__dirname, '../image.jpeg');
let thumbnail;
try {
  thumbnail = fs.readFileSync(imagePath);
} catch {
  thumbnail = null;
}

module.exports = {
  status: "on",
  name: 'Bot Commands',
  command: ['قائمه'],
  category: 'tools',
  description: '⌯︙لعرض قائمة الأوامر حسب الفئة',
usage: '.قائمه',
  hidden: false,
  version: '3.3',

  async execute(sock, msg) {
    try {
      const body = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
      const args = body.trim().split(' ').slice(1);
      const plugins = getPlugins();
      const categories = {};
      const excludedCategories = ['zarf', 'misc', 'tools', 'غير مصنفة'];

      // تجميع الأوامر في الفئات
      Object.values(plugins).forEach((plugin) => {
        if (plugin.hidden) return;
        const category = plugin.category?.toLowerCase() || 'غير مصنفة';
        if (excludedCategories.includes(category)) return;

        if (!categories[category]) categories[category] = [];

        let commandDisplay = '';
        if (Array.isArray(plugin.command) && plugin.command.length > 1) {
          commandDisplay = plugin.command.map(cmd => `\`${cmd}\``).join(' - ');
        } else {
          const cmd = Array.isArray(plugin.command) ? plugin.command[0] : plugin.command;
          commandDisplay = `\`${cmd}\``;
        }

        if (plugin.description) {
          commandDisplay += ` | ${plugin.description}`;
        }

        categories[category].push(commandDisplay);
      });

      // لو كتب .اوامر بدون أي شي → يرسل لستة الفئات
      if (args.length === 0) {
        const sections = [
          {
            title: "📂 الفئات المتوفرة",
            rows: Object.keys(categories).map((cat, index) => ({
              title: `القسم ${index + 1} : ${cat}`,
              rowId: `.اوامر ${cat}`,
              description: `لعرض أوامر قسم ${cat}`
            }))
          }
        ];

        return await sock.sendMessage(msg.key.remoteJid, {
          text: "🍬 أقسام البوت",
          footer: "اختر القسم اللي تبيه من القائمة 👇",
          title: "📌 قائمة الأوامر",
          buttonText: "عرض الأقسام 🍭",
          sections
        }, { quoted: msg });
      }

      // لو كتب .اوامر [فئة] أو اختار من القائمة
      const requestedCategory = args.join(' ').toLowerCase();
      if (!categories[requestedCategory]) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: `❌ الفئة *${requestedCategory}* غير موجودة.\nاكتب \`.اوامر\` لعرض الفئات المتاحة.`
        }, { quoted: msg });
      }

      let menu = `*📂 أوامر قسم: ${requestedCategory}*\n\n`;
      categories[requestedCategory].forEach((cmdText, i) => {
        menu += `${i + 1}. ${cmdText}\n`;
      });

      await sock.sendMessage(msg.key.remoteJid, {
        image: thumbnail ? thumbnail : undefined,
        caption: menu
      }, { quoted: msg });

    } catch (error) {
      console.error('❌ Menu Error:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ حدث خطأ أثناء إنشاء القائمة.'
      }, { quoted: msg });
    }
  }
};