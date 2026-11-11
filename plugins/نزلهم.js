const { eliteNumbers } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
  command: 'نزلهم',
  description: 'ينزل كل المشرفين في المجموعة ما عدا من كتب الأمر.',
  usage: '.نزلهم',
  category: 'إدارة',

  async execute(sock, msg) {
    try {
      const groupJid = msg.key.remoteJid;
      const senderJid = decode(msg.key.participant || groupJid);
      const senderNumber = senderJid.split('@')[0];

      if (!groupJid.endsWith('@g.us')) {
        return await sock.sendMessage(groupJid, {
          text: '❌ هذا الأمر يعمل فقط داخل المجموعات.',
        }, { quoted: msg });
      }

      if (!eliteNumbers.includes(senderNumber)) {
        return await sock.sendMessage(groupJid, {
          text: '🚫 هذا الأمر مخصص للنخبة فقط.',
        }, { quoted: msg });
      }

      const groupMetadata = await sock.groupMetadata(groupJid);
      const admins = groupMetadata.participants.filter(
        m => m.admin === 'admin' || m.admin === 'superadmin'
      );

      if (admins.length === 0) {
        return await sock.sendMessage(groupJid, {
          text: '❗ لا يوجد مشرفون في هذه المجموعة.',
        }, { quoted: msg });
      }

      const demoteList = admins
        .map(a => a.id)
        .filter(id => id !== senderJid);

      if (demoteList.length === 0) {
        return await sock.sendMessage(groupJid, {
          text: '🚫 لا يوجد مشرفون يمكن إزالة إشرافهم غيرك.',
        }, { quoted: msg });
      }

      await sock.groupParticipantsUpdate(groupJid, demoteList, 'demote');

      await sock.sendMessage(groupJid, {
        text: `𝑰'𝑴 𝑲𝑰𝑵𝑮 👑`,
        mentions: [senderJid],
      }, { quoted: msg });

    } catch (error) {
      console.error('❌ خطأ في أمر نزلهم:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '⚠️ حدث خطأ أثناء تنفيذ العملية.',
      }, { quoted: msg });
    }
  }
};