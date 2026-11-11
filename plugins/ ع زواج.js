const { isElite } = require('../haykala/elite');

module.exports = {
  command: 'زوجني',
  description: 'إعلان زواج عشوائي بين عضوين من القروب.',
usage: '. ع زواج',
  category: 'general',

  async execute(sock, msg) {
    const groupJid = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderNumber = senderJid.split('@')[0];

    if (!groupJid.endsWith('@g.us')) {
      return sock.sendMessage(groupJid, {
        text: '❌ هذا الأمر يعمل فقط داخل القروبات.'
      }, { quoted: msg });
    }

    if (!isElite(senderNumber)) {
      return sock.sendMessage(groupJid, {
        text: '🚫 هذا الأمر مخصص للنخبة فقط.'
      }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(groupJid);
    const members = metadata.participants.map(p => p.id).filter(id => !id.includes(sock.user.id));

    if (members.length < 2) {
      return sock.sendMessage(groupJid, {
        text: '❌ عدد الأعضاء غير كافٍ لاختيار زوجين.'
      }, { quoted: msg });
    }

    // اختيار عضوين عشوائيًا
    const shuffled = members.sort(() => Math.random() - 0.5);
    const groom = shuffled[0];
    let bride = shuffled[1];

    // التأكد من عدم اختيار نفس الشخص
    if (groom === bride && members.length > 2) {
      bride = shuffled[2];
    }

    const message = `*┃╻💖╹↵ ※ ⧼ إعــــلان زواج ⧽ ※*\n\n` +
      `*┃╻🎊╹↵ ※ نـبـارك لـلـثـنـائـي الـجمـيـل ※*\n\n` +
      `*┃╻👑╹↵ ※ 「 @${groom.split('@')[0]} 」 × 「 @${bride.split('@')[0]} 」 ※*\n\n` +
      `*┣┅ ━━━━━━『 💞 』━━━━━━ ┅ ━┣*\n\n` +
      `*┃╻💌╹↵ ※ نـتـمـنـى لـكـم حيـاة سـعيـدة مـلـيئـة بـالـود والـفـرح ※*\n\n` +
      `*┣┅ ━━━━━━『 💞 』━━━━━━ ┅ ━┣*\n\n` +
      `*┃╻🎁╹↵ ※ الـمـهـر : ⧼ 50k ذهـب + هديـة خاصـة ⧽ ※*\n\n` +
      `*┗┅ ━━━━━━━━━━━━━━━━ ┅ ━┛*\n` +
      `> بـخـالص الـمـحـبـة: *Shanks 𝐵𝑂𝑇 💌*`;

    await sock.sendMessage(groupJid, {
      text: message,
      mentions: [groom, bride]
    }, { quoted: msg });
  }
};