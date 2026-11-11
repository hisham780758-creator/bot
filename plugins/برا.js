module.exports = {
  command: 'دزز',
  description: 'يطرد العضو من الجروب (للمشرفين فقط)',
  category: 'admin',
  usage: '.طير @ أو رد على الرسالة',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    // تأكد أنه داخل جروب
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, {
        text: '⚠️ هذا الأمر يستخدم فقط في الجروبات.\n\n- أتوميك'
      }, { quoted: msg });
    }

    try {
      // تحقق من صلاحية المشرف
      const groupMetadata = await sock.groupMetadata(jid);
      const admins = groupMetadata.participants
        .filter(p => p.admin !== null)
        .map(p => p.id);

      if (!admins.includes(sender)) {
        return sock.sendMessage(jid, {
          text: '🚫 هذا الأمر مخصص للمشرفين فقط.\n\n- أتوميك'
        }, { quoted: msg });
      }

      // جلب الهدف (منشن أو رد)
      let target = null;

      // لو فيه منشن
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (mention && mention.length > 0) {
        target = mention[0];
      }

      // لو مفيش منشن، لكن فيه رد على رسالة
      if (!target && msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = msg.message.extendedTextMessage.contextInfo.participant;
      }

      if (!target) {
        return sock.sendMessage(jid, {
          text: '⚠️ منشن الشخص أو رد على رسالته عشان تطيره.\n\n- أتوميك'
        }, { quoted: msg });
      }

      // تنفيذ الطرد
      await sock.groupParticipantsUpdate(jid, [target], 'remove');

      // تفاعل 🫦 على رسالة صاحب الأمر
      await sock.sendMessage(jid, {
        react: {
          text: '🫦',
          key: msg.key
        }
      });

    } catch (err) {
      console.error('❌ خطأ في أمر طير:', err.message || err);
      return sock.sendMessage(jid, {
        text: '⚠️ فشل تنفيذ الأمر. تأكد أن لدى البوت صلاحية مشرف في المجموعة.\n\n- أتوميك'
      }, { quoted: msg });
    }
  }
};