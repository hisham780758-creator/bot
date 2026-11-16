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
  command: 'كتابة',
  category: 'games',
  description: 'فعالية كتابة اسم شخصية أنمي بأسرع وقت',
usage: '.كتابة',

  async execute(sock, msg) {
    const groupJid = msg.key.remoteJid;
    if (!groupJid.endsWith('@g.us')) {
      return sock.sendMessage(groupJid, {
        text: '*❌ هذا الأمر يعمل فقط في القروبات.*'
      }, { quoted: msg });
    }

    const characters = [
      "ناروتو", "ساسكي", "سيتو كايبا", "لوفي", "غوكو",
      "إيتاتشي", "تانجيرو", "نيزوكو", "كاجومي", "ليفاي",
      "كاكاشي", "سايتاما", "زورو", "هيجي كاتا", "إيرين",
      "أرمين", "ريوغا هيبيكي", "هيسوكا", "كيلوا", "كونان"
    ];

    const selected = characters[Math.floor(Math.random() * characters.length)];

    const startMessage = 
`*فـعـالـيـة الـيـوم : ˼‏🎐˹*
*‏⎔ ٠ ┈─ ━╼ • ◞🎻◜ • ╾━ ─┈‏ ٠ ⎔*

*┃╻📜╹↵اسـم الفـعـالـية↯* 
*⧉┋※〔كـتـابـة〕※*

*┃╻🍁╹↵ شـرح الـفـعالـية ↯*
*⧉┋※〔البوت يرسل اسم شخصية أنمي، وأول من يكتبه بشكل مطابق يفوز〕※*

*┃╻📜╹↵اكتب اسم الشخصية التالية ↯*
*⧉┋※〔${selected}〕※*

*┃╻💣╹↵لـديكـم 30 ثـانـيـة للإجـابـة ↯*
*‏⎔ ٠ ┈─ ━╼ • ◞🎻◜ • ╾━ ─┈‏ ٠ ⎔*
*٭ فـعـالـيـات بـوت إيـريـن ٭*
*٭𝐺𝐴𝑀𝐸𝑆 𝐵𝑂𝑇 Ascanor ٭*`;

    await sock.sendMessage(groupJid, { text: startMessage }, { quoted: msg });

    let isAnswered = false;

    const listener = async (event) => {
      if (isAnswered) return;

      const m = event.messages[0];
      if (!m.message || m.key.remoteJid !== groupJid) return;

      const body = m.message?.conversation?.trim();
      if (!body) return;

      if (body === selected) {
        isAnswered = true;
        sock.ev.off('messages.upsert', listener);

        const sender = m.key.participant;
        const senderId = extractPureNumber(sender);

        const pointsData = loadPoints();
        pointsData[senderId] = (pointsData[senderId] || 0) + 10;
        savePoints(pointsData);

        await sock.sendMessage(groupJid, {
          text: 
`*⧉┋٭ انـتـهـت الـفـعالـيـة ٭*

*┃╻💐╹↵الـفـائـز ↯*
*❐ ↵「 @${senderId} 」*

*┃╻🪻╹↵الإجـابـة ↯* 
*❐ ↵「${selected}」*

*تـم مـنحـه الـنـقـاط* 🍁🪺`,
          mentions: [sender]
        }, { quoted: m });
      }
    };

    sock.ev.on('messages.upsert', listener);

    setTimeout(async () => {
      sock.ev.off('messages.upsert', listener);
      if (!isAnswered) {
        await sock.sendMessage(groupJid, {
          text: `*⧉┋٭ انـتـهـت الـفـعالـيـة ٭*\n\n*❐ ↵ لم يجب أحد في الوقت المحدد.*\n*┃╻🪻╹↵الإجـابـة ↯*\n*❐ ↵「${selected}」*`
        }, { quoted: msg });
      }
    }, 30000);
  }
};