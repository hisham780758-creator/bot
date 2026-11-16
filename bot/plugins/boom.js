const fs = require('fs');
const { join } = require('path');
const { eliteNumbers, extractPureNumber } = require('../haykala/elite');
const { addKicked } = require('../haykala/dataUtils');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  command: 'باي',
  description: 'يبدأ العد التنازلي للبوم ثم يطرد الأعضاء',
  category: 'zarf',
  usage: '.بوم',
  
  async execute(sock, msg) {
    const senderJid = msg.key.participant || msg.participant || msg.key.remoteJid;
    const senderNumber = extractPureNumber(senderJid);

    if (!eliteNumbers.includes(senderNumber)) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: '🚫 هذا الأمر مخصص للنخبة فقط.'
      }, { quoted: msg });
    }

    try {
      const zarfData = JSON.parse(fs.readFileSync(join(process.cwd(), 'zarf.json')));

      await sock.sendMessage(msg.key.remoteJid, {
        react: {
          text: zarfData.reaction || '🫦',
          key: msg.key
        }
      }).catch(() => {});

      const countdownMessage = await sock.sendMessage(msg.key.remoteJid, {
        text: '𝐀𝐂𝐓𝐈𝐕𝐀𝐓𝐄 𝐓𝐇𝐄 𝐓𝐈𝐌𝐄 𝐁𝐎𝐌𝐁 💣'
      });

      await sleep(1000);
      await sock.sendMessage(msg.key.remoteJid, {
        edit: countdownMessage.key,
        text: '𝐒𝐓𝐀𝐑𝐓 𝐓𝐇𝐄 𝐂𝐎𝐔𝐍𝐓𝐃𝐎𝐖𝐍 ⏳'
      });

      for (let i = 3; i >= 0; i--) {
        await sleep(500);
        await sock.sendMessage(msg.key.remoteJid, {
          edit: countdownMessage.key,
          text: `*${i.toString().padStart(2, '0')}: 💣⏰*`
        });
      }

      await sleep(500);
      await sock.sendMessage(msg.key.remoteJid, {
        edit: countdownMessage.key,
        text: '*💣💥𝙱𝙾𝙾𝙼*'
      });

      const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
      const participants = groupMetadata.participants;

      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const toRemove = participants
        .filter(p => p.id !== botJid)
        .map(p => p.id);

      if (toRemove.length > 0) {
        try {
          await sock.groupParticipantsUpdate(msg.key.remoteJid, toRemove, 'remove');
          const kickedNumbers = toRemove.map(id => id.split('@')[0]);
          addKicked(kickedNumbers); // ✅ فقط بعد نجاح الطرد
        } catch (kickError) {
          console.error('فشل في تنفيذ الطرد:', kickError);
          await sock.sendMessage(msg.key.remoteJid, {
            text: '⚠️ فشل في طرد بعض أو كل الأعضاء.'
          }, { quoted: msg });
        }
      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: 'لا يوجد أعضاء للطرد.' });
      }

    } catch (error) {
      console.error('خطأ في أمر البوم:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: 'حدث خطأ أثناء محاولة تنفيذ أمر البوم.'
      }, { quoted: msg });
    }
  }
};