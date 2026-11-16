const fs = require('fs');
const { eliteNumbers } = require('../haykala/elite.js'); // لو تبي تحمي الأمر للنخبة

module.exports = {
  command: ['طلبات'],
  description: 'إدارة طلبات الانضمام للمجموعة (عرض، قبول، رفض)',
  usage: '.قبول قائمة\n.قبول قبول 1|2\n.قبول رفض 1|2\n.قبول قبول الكل\n.قبول رفض الكل',
  category: 'المجموعات',

  async execute(sock, msg, args = []) {
    try {
      // لو تبي تقيّد للأرقام النخبة - شيل التعليق إذا ما تبي
      /*
      const sender = msg.key.participant || msg.key.remoteJid;
      const senderNumber = sender.split('@')[0];
      if (!eliteNumbers.includes(senderNumber)) {
        return await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ هذا الأمر مخصص للنخبة فقط.',
        }, { quoted: msg });
      }
      */

      // قراءة النص الكامل للرسالة
      const fullText =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

      // نفصل النص إلى كلمات (مثلاً: ".قبول قائمة" => ["قبول", "قائمة"])
      const parts = fullText.trim().split(/\s+/);

      // أول كلمة هي الأمر (غالبًا "قبول")، الثانية هي subCommand (قائمة/قبول/رفض)، الباقي options
      const subCommand = parts[1] ? parts[1].toLowerCase() : '';
      const options = parts.slice(2).join(' ').toLowerCase();

      const groupId = msg.key.remoteJid;

      const imagePath = 'image.jpeg';
      const hasImage = fs.existsSync(imagePath);
      const imageBuffer = hasImage ? fs.readFileSync(imagePath) : null;

      const reply = async (text) => {
        await sock.sendMessage(groupId, {
          text,
          contextInfo: {
            externalAdReply: {
              title: 'بوت الإدارة',
              body: 'إدارة طلبات الانضمام',
              thumbnail: imageBuffer,
              mediaType: 1,
              sourceUrl: 'https://t.me/YourChannel', // غير الرابط حسب ما تريد
              renderLargerThumbnail: false,
              showAdAttribution: true
            }
          }
        }, { quoted: msg });
      };

      const joinRequestList = await sock.groupRequestParticipantsList(groupId);

      switch (subCommand) {
        case 'قائمة': // بديل "list"
          if (joinRequestList.length === 0) {
            return reply('لا توجد طلبات انضمام معلقة حالياً.');
          }
          let listText = '*قائمة طلبات الانضمام:*\n\n';
          joinRequestList.forEach((request, i) => {
            const timestamp = request.request_time;
            const date = new Intl.DateTimeFormat('ar-EG', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            }).format(new Date(timestamp * 1000));
            listText += `*${i + 1}.*\n• الرقم: ${request.jid.split('@')[0]}\n• طريقة الطلب: ${request.request_method}\n• التاريخ: ${date}\n\n`;
          });
          return reply(listText);

        case 'قبول': // بديل "approve"
        case 'رفض':  // بديل "reject"
          if (!options) {
            return reply(`يرجى تحديد الأعضاء أو استخدام "الكل" لجميع الطلبات.\nمثال: .قبول ${subCommand} الكل\nأو .قبول ${subCommand} 1|2|3`);
          }

          if (options === 'الكل') {
            for (const request of joinRequestList) {
              await sock.groupRequestParticipantsUpdate(groupId, [request.jid], subCommand === 'قبول' ? 'approve' : 'reject');
              console.log(`${subCommand} الطلب من: ${request.jid}`);
            }
            return reply(`تم ${subCommand === 'قبول' ? 'قبول' : 'رفض'} جميع طلبات الانضمام.`);
          }

          // تحويل الخيارات (مثلاً "1|2|3") إلى أرقام ونختار الطلبات
          const indices = options.split('|').map(x => parseInt(x.trim()) - 1).filter(i => i >= 0 && i < joinRequestList.length);
          if (indices.length === 0) {
            return reply('لم يتم العثور على طلبات تناسب الأرقام المدخلة.');
          }

          let responseText = `تم ${subCommand === 'قبول' ? 'قبول' : 'رفض'} الطلبات:\n\n`;
          for (const i of indices) {
            const request = joinRequestList[i];
            try {
            const res = await sock.groupRequestParticipantsUpdate(groupId, [request.jid], subCommand === 'قبول' ? 'approve' : 'reject');
              const status = res[0]?.status === 'success' ? 'نجح' : 'فشل';
              responseText += `• ${i + 1}. الرقم: ${request.jid.split('@')[0]} - الحالة: ${status}\n`;
              console.log(`${subCommand} الطلب من: ${request.jid} - ${status}`);
            } catch {
              responseText += `• ${i + 1}. الرقم: ${request.jid.split('@')[0]} - الحالة: خطأ\n`;
            }
          }
          return reply(responseText);

        default:
          return reply(`أمر غير معروف.\nيرجى استخدام:\n- .طلبات قائمة\n- .طلبات قبول [رقم|الكل]\n- .طلبات رفض [رقم|الكل]`);
      }
    } catch (e) {
      console.error(e);
      await sock.sendMessage(msg.key.remoteJid, { text: 'حدث خطأ أثناء تنفيذ الأمر. يرجى المحاولة لاحقاً.' }, { quoted: msg });
    }
  }
};