const fs = require('fs');
const path = require('path');
const { extractPureNumber } = require('../haykala/elite');

const pointsFile = path.join(__dirname, '../data/points.json');

function loadPoints() {
  try {
    return JSON.parse(fs.readFileSync(pointsFile));
  } catch {
    return {};
  }
}

function savePoints(points) {
  fs.writeFileSync(pointsFile, JSON.stringify(points, null, 2));
}

module.exports = {
  command: 'تفكيك',
  category: 'games',
  description: 'فعالية تفكيك كلمة - رتب الحروف لتكون الكلمة الصحيحة',
usage: '.تفكيك',

  async execute(sock, msg) {
    const groupJid = msg.key.remoteJid;
    if (!groupJid.endsWith('@g.us')) {
      return sock.sendMessage(groupJid, {
        text: '*❌ هذا الأمر يعمل فقط في القروبات.*'
      }, { quoted: msg });
    }

    const words = [
      "ناروتو", "دراغون", "ايتاتشي", "كونان", "زورو", "ميكاسا", "تانجيرو", "كاكاشي", "غوكو", "لوفي"
    ];

    const originalWord = words[Math.floor(Math.random() * words.length)];
    const shuffled = originalWord.split('').sort(() => Math.random() - 0.5).join(' ');

    const message = `*فـعـالـيـة الـيـوم : ˼‏🎐˹*\n*‏⎔ ٠ ┈─ ━╼ • ◞🎻◜ • ╾━ ─┈‏ ٠ ⎔*\n\n` +
      `*┃╻📜╹↵اسـم الفـعـالـية↯*\n*⧉┋※〔تـفـكـيـك〕※*\n\n` +
      `*┃╻🍁╹↵ شـرح الـفـعالـية ↯*\n*⧉┋※〔الـبـوت سـيـرسـل كـلـمـة مـفـكـكـة، وعـلـيـكـم تـرتـيـب الـحـروف لـتـكـوين الـكـلـمـة〕※*\n\n` +
      `*┃╻📜╹↵الكـلـمـة الـمـفـكـكـة↯*\n*⧉┋※〔 ${shuffled} 〕※*\n\n` +
      `*┃╻💣╹↵لـديكـم 30 ثـانـيـة للإجـابـة ↯*\n*‏⎔ ٠ ┈─ ━╼ • ◞🎻◜ • ╾━ ─┈‏ ٠ ⎔*\n` +
      `*٭ فـعـالـيـات بـوت إيـريـن ٭*\n*٭𝐺𝐴𝑀𝐸𝑆 𝐵OT ASCANOR ٭*`;

    await sock.sendMessage(groupJid, { text: message }, { quoted: msg });

    let isAnswered = false;
    const answer = originalWord.toLowerCase();

    const listener = async (event) => {
      if (isAnswered) return;
      const m = event.messages[0];
      if (!m.message || m.key.remoteJid !== groupJid) return;
      const body = m.message?.conversation?.toLowerCase()?.trim();
      if (!body) return;

      if (body === answer) {
        isAnswered = true;
        sock.ev.off('messages.upsert', listener);

        const sender = m.key.participant;
        const number = extractPureNumber(sender);
        const pointsData = loadPoints();

        pointsData[number] = (pointsData[number] || 0) + 10;
        savePoints(pointsData);

        await sock.sendMessage(groupJid, {
          text:
`*⧉┋٭ انـتـهـت الـفـعالـية ٭*\n\n` +
`*┃╻💐╹↵الـفـائـز ↯*\n*❐ ↵「 @${number} 」*\n` +
`*┃╻🪻╹↵الإجـابـة ↯*\n*❐ ↵「 ${originalWord} 」*\n\n` +
`*تـم مـنحـه الـنـقـاط* 🍁🪺`,
          mentions: [sender]
        }, { quoted: m });
      }
    };

    sock.ev.on('messages.upsert', listener);

    setTimeout(async () => {
      sock.ev.off('messages.upsert', listener);
      if (!isAnswered) {
        await sock.sendMessage(groupJid, {
          text: `*⧉┋٭ انـتـهـت الـفـعالـية ٭*\n\n*❐ ↵ لم يجب أحد في الوقت المحدد.*\n*┃╻🪻╹↵الإجـابـة ↯*\n*❐ ↵「 ${originalWord} 」*`
        }, { quoted: msg });
      }
    }, 30000);
  }
};