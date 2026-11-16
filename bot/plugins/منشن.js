const { isElite, extractPureNumber } = require('../haykala/elite');

module.exports = {
  command: 'منشن',
  description: 'منشن ظاهر لجميع أعضاء القروب مع تقسيم المشرفين والأعضاء.',
  usage: '.منشن',
  category: 'group',

  async execute(sock, msg) {
    // التوثيق الوهمي
    const fakeOfficial = {
      key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "120363025246999999@g.us",
        id: "BAE5F7C88C7D8A3D3F1A3A",
      },
      message: {
        videoMessage: {
          title: "𝑨 • S V2...",
          seconds: "99999",
          gifPlayback: true,
          caption: "بّےــوُت𝒂𝒔𝒄𝒂𖤍",
          jpegThumbnail: Buffer.alloc(0)
        }
      }
    };

    try {
      const senderJid = msg.key.participant || msg.participant || msg.key.remoteJid;
      const senderNumber = extractPureNumber(senderJid);
      const groupJid = msg.key.remoteJid;

      if (!groupJid.endsWith('@g.us')) {
        return sock.sendMessage(groupJid, {
          text: '❌ هذا الأمر يعمل فقط داخل المجموعات.'
        }, { quoted: fakeOfficial });
      }

      if (!isElite(senderNumber)) {
        return sock.sendMessage(groupJid, {
          text: '🚫 هذا الأمر مخصص للنخبة فقط.'
        }, { quoted: fakeOfficial });
      }

      const metadata = await sock.groupMetadata(groupJid);
      const participants = metadata.participants;

      const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
      const members = participants.filter(p => !p.admin);

      const mentions = [...admins.map(p => p.id), ...members.map(p => p.id)];

      const adminsText = admins.map(p => `*┃╻❄️╹↵ 「 @${p.id.split('@')[0]} 」`).join('\n') || '*┃╻❄️╹↵ 「 لا يوجد مشرفين 」';
      const membersText = members.map(p => `*┃╻🍹╹↵ 「 @${p.id.split('@')[0]} 」`).join('\n') || '*┃╻🍹╹↵ 「 لا يوجد أعضاء 」';

      const message = `*┣┅ ━━━━━━『 🐣 』━━━━━━ ┅ ━┣*\n` +
        `*┃╻🛡️╹↵ ※ ⧼ مـنـشـن الـمشـرفـيـن ⧽ ※*\n${adminsText}\n` +
        `*┣┅ ━━━━━━『 👥 』━━━━━━ ┅ ━┣*\n` +
        `*┃╻🐣╹↵ ※ ⧼ مـنـشـن الأعـضـاء ⧽ ※*\n` +
        `*┃╻📌╹↵ ※ نـور القـروب، تواجـدكـم يسعـدنا ↓ ※*\n${membersText}\n` +
        `*┣┅ ━━━━━━━━━━━━━━ ┅ ━┣*\n` +
        `*┃╻🤖╹↵ ※ ASCANOR 𝐵𝑂𝑇 يتشرف بتواجـدكم ※*`;

      await sock.sendMessage(groupJid, {
        text: message,
        mentions
      }, { quoted: fakeOfficial });

    } catch (err) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ حدث خطأ:\n${err.message || err.toString()}`
      }, { quoted: fakeOfficial });
    }
  }
};