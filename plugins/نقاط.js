const fs = require('fs');
const path = require('path');

const pointsFile = path.join(__dirname, '../data/ranks.json');
let points = {};

if (fs.existsSync(pointsFile)) {
  points = JSON.parse(fs.readFileSync(pointsFile));
}

module.exports = {
  command: 'نقاط',
  category: 'info',
  description: 'اعرف رصيدك من النقاط 🎯',
usage: '.نقاط',

  async execute(sock, msg) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const score = points[sender] || 0;

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🏆 نقاطك الحالية: *${score}*`,
    }, { quoted: msg });
  }
};