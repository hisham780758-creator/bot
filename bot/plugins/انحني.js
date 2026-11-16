const { delay } = require('@whiskeysockets/baileys');
const { isElite } = require('../haykala/elite.js');

module.exports = {
  command: "انحني",
  description: "يقفل الشات، يرسل رسالة، يطرد شخص، ثم يفتح الشات.",
  usage: '.انحني',
  category: "admin",

  async execute(sock, msg, args, store) {
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
          title: "S • S V2...",
          seconds: "99999",
          gifPlayback: true,
          caption: "عَےـبّےـدُ آسًےـكےـآ",
          jpegThumbnail: Buffer.alloc(0)
        }
      }
    };

    const groupId = msg.key.remoteJid;
    const senderJid = msg.participant || msg.key.participant || msg.key.remoteJid;
    const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    // تحقق من صلاحية النخبة
    if (!isElite(senderJid)) {
      // رد مذل داخل الجروب
      return sock.sendMessage(groupId, {
        text: `🚫 يا @${senderJid.split("@")[0]}, أنت تحاول تستخدم أمر مخصص للنخبة؟\n🤣 إنت آخر واحد ممكن يُسمح له بأمر زي ده.\nاجلس مكانك يا بقايا الكرامة، قبل ما تاخذ طرد بدورك.`,
        mentions: [senderJid],
        quoted: fakeOfficial
      });
    }

    // تحقق من الوسم
    if (!mentionedJid) {
      return sock.sendMessage(groupId, {
        text: "👤 من تريد إجباره على الانحناء؟ استخدم: .انحني @رقم"
      }, { quoted: fakeOfficial });
    }

    try {
      // 1. قفل الشات
      await sock.groupSettingUpdate(groupId, "announcement");

      // 2. إرسال رسالة مذلة مع منشن
      await sock.sendMessage(groupId, {
        text: `اهلا يا معاق @${mentionedJid.split("@")[0]} احب ابشرك ب شي\n\nممكن تنظر للاسفل👇🏻 🤧🖤`,
        mentions: [mentionedJid]
      }, { quoted: fakeOfficial });

      // 3. طرد الشخص بعد 2 ثانية
      await delay(2000);
      await sock.groupParticipantsUpdate(groupId, [mentionedJid], "remove");

      // 4. إعادة فتح الشات بعد 2 ثانية
      await delay(2000);
      await sock.groupSettingUpdate(groupId, "not_announcement");

      // 5. رسالة ختامية مع منشن للشخص
      await sock.sendMessage(groupId, {
        text: `آنحنيـﮯ ليـﮯ عمـگ آسـگآ يـﮯآ مـعآق @${mentionedJid.split("@")[0]}`,
        mentions: [mentionedJid]
      }, { quoted: fakeOfficial });

    } catch (error) {
      console.error("❌ خطأ:", error);
      await sock.sendMessage(groupId, {
        text: "⚠️ حدث خطأ أثناء تنفيذ الأمر. تأكد أن البوت أدمن في الجروب."
      }, { quoted: fakeOfficial });
    }
  }
};