const fs = require('fs');
const path = require('path');

const contactsFile = path.join(__dirname, '../data/جهات.json');

function getEnabledChats() {
  if (!fs.existsSync(contactsFile)) {
    fs.writeFileSync(contactsFile, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(contactsFile, 'utf8'));
}

function saveEnabledChats(chats) {
  fs.writeFileSync(contactsFile, JSON.stringify(chats, null, 2));
}

module.exports = {
  command: 'جهات',
  description: 'منع ارسال جهات الاتصال',
  usage: '.جهات تشغيل / .جهات ايقاف',
  category: 'groups',

  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;
    const args = msg.args || [];
    const text = args.join(' ').trim();

    let enabledChats = getEnabledChats();

    if (text === 'تشغيل') {
      if (enabledChats.includes(chatId)) {
        return sock.sendMessage(chatId, {
          text: 'منع الجهات شغال بالفعل'
        }, { quoted: msg });
      }

      enabledChats.push(chatId);
      saveEnabledChats(enabledChats);

      return sock.sendMessage(chatId, {
        text: 'تم تشغيل منع جهات الاتصال'
      }, { quoted: msg });
    }

    if (text === 'ايقاف') {
      if (!enabledChats.includes(chatId)) {
        return sock.sendMessage(chatId, {
          text: 'منع الجهات مو شغال'
        }, { quoted: msg });
      }

      enabledChats = enabledChats.filter(id => id !== chatId);
      saveEnabledChats(enabledChats);

      return sock.sendMessage(chatId, {
        text: 'تم إيقاف منع جهات الاتصال'
      }, { quoted: msg });
    }
  }
};