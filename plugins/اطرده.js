const { delay } = require('@whiskeysockets/baileys');
const { isElite } = require('../haykala/elite.js');

module.exports = {
  command: "اطرده",
  description: "امر مزله مع طرد الشخص للنخبة فقط",
usage: '.اطرده',
  category: "group",

  async execute(sock, msg, args) {
    try {
      const groupId = msg.key.remoteJid;
      const senderJid = msg.key.participant || msg.participant || msg.key.remoteJid;
      const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

      if (!isElite(senderJid)) {
        return await sock.sendMessage(groupId, {
          text: `❌ فقط النخبة يمكنهم استخدام هذا الأمر.`,
          mentions: [senderJid]
        });
      }

      const groupMetadata = await sock.groupMetadata(groupId);
      const participants = groupMetadata.participants;
      const admins = participants.filter(p => p.admin !== null).map(p => p.id);

      // سطور للتأكد (اختياري لو عاوز تشوف في اللوج)
      console.log("قائمة الإدمنز:", admins);
      console.log("رقم البوت:", botNumber);

      // شرط الإدمنية اتشال — البوت هيكمل تنفيذ بغض النظر

      let mentionedJid;
      if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        mentionedJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else if (msg.message.extendedTextMessage?.contextInfo?.participant) {
        mentionedJid = msg.message.extendedTextMessage.contextInfo.participant;
      } else {
        return await sock.sendMessage(groupId, {
          text: "❌ منشن الشخص الذي تريد طرده أو رد على رسالته"
        });
      }

      // 1. قفل الشات
      await sock.groupSettingUpdate(groupId, "announcement");

      // 2. رسالة إهانة مزله عن الطرد
      await sock.sendMessage(groupId, {
        text: `🚷 يا @${mentionedJid.split('@')[0]}، انت وصمة عار في الجروب! هتطرد حالاً.`,
        mentions: [mentionedJid]
      });

      // 3. رسائل إهانة مزله متتابعة
      await delay(1500);
      await sock.sendMessage(groupId, { text: "🥱 عمك سونغ طفشان، اصبر وبلطج شويه..." });
      await delay(1500);
      await sock.sendMessage(groupId, { text: "⚡ يلا اجهز، آخر فرصة ليك!" });
      await delay(1500);
      await sock.sendMessage(groupId, { text: "🥱 قلت لك عمك سونغ طفشان، مش هزار!" });
      await delay(1500);
      await sock.sendMessage(groupId, { text: "⚡ اجهز يلا، آخر كلام قبل الطرد." });

      // 4. طرد الشخص
      await sock.groupParticipantsUpdate(groupId, [mentionedJid], "remove");

      // 5. فتح الشات بعد الطرد
      await sock.groupSettingUpdate(groupId, "not_announcement");

      // 6. رسالة تأكيد
      await sock.sendMessage(groupId, { text: "✅ تم فتح الشات والطرد تم بنجاح" });

    } catch (error) {
      console.error("❌ خطأ في أمر الاطرد:", error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: "⚠️ حدث خطأ أثناء تنفيذ الأمر. تأكد أن البوت أدمن في الجروب."
      });
    }
  }
};