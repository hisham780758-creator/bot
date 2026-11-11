const { isElite } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

const timers = new Map(); // لتخزين مؤقتات القفل لكل جروب

module.exports = {
  command: 'شات',
  description: 'قفل أو فتح الشات مع تحديد مدة بالدقائق',
  usage: '.شات قفل 2 أو .شات فتح 3',
category: 'tools',

  async execute(sock, msg) {
    try {
      const groupJid = msg.key.remoteJid;
      const sender = decode(msg.key.participant || groupJid);
      const senderLid = sender.split('@')[0];

      if (!groupJid.endsWith('@g.us')) {
        return await sock.sendMessage(groupJid, {
          text: '❗ هذا الأمر يعمل فقط داخل المجموعات.'
        }, { quoted: msg });
      }

      if (!isElite(senderLid)) {
        return await sock.sendMessage(groupJid, {
          text: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.'
        }, { quoted: msg });
      }

      // استخراج نص الرسالة (بدون البريفكس)
      let body = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
      body = body.trim();

      // يفترض أن الأمر يبدأ بـ "شات" لذا نحذفه لنأخذ باقي النص
      let args = body.split(/\s+/).slice(1); // حذف "شات"

      if (args.length < 2) {
        return await sock.sendMessage(groupJid, {
          text: '❌ يرجى كتابة الأمر بهذا الشكل:\n.شات قفل 2 أو .شات فتح 3'
        }, { quoted: msg });
      }

      const action = args[0].toLowerCase();
      const minutes = parseInt(args[1]);

      if (!['قفل', 'فتح'].includes(action) || isNaN(minutes) || minutes <= 0) {
        return await sock.sendMessage(groupJid, {
          text: '❌ يرجى كتابة الأمر بهذا الشكل:\n.شات قفل 2 أو .شات فتح 3\n(المدة بالدقائق يجب أن تكون رقم صحيح أكبر من صفر)'
        }, { quoted: msg });
      }

      // الوظيفة التي تغلق أو تفتح الشات حسب الإجراء
      const setGroupMode = async (mode) => {
        await sock.groupSettingUpdate(groupJid, mode);
      };

      if (action === 'قفل') {
        await setGroupMode('announcement'); // قفل الشات (الرسائل من المشرفين فقط)
        await sock.sendMessage(groupJid, {
          text: `🔒 تم قفل الشات لمدة ${minutes} دقيقة${minutes > 1 ? 'ات' : ''}.`
        });

        // إلغاء أي مؤقت سابق على نفس الجروب
        if (timers.has(groupJid)) {
          clearTimeout(timers.get(groupJid));
        }

        // تعيين مؤقت لفتح الشات تلقائياً بعد انتهاء الوقت
        const timer = setTimeout(async () => {
          await setGroupMode('not_announcement'); // فتح الشات
          await sock.sendMessage(groupJid, {
            text: `🔓 تم فتح الشات تلقائياً بعد انتهاء المهلة.`
          });
          timers.delete(groupJid);
        }, minutes * 60 * 1000);

        timers.set(groupJid, timer);

      } else if (action === 'فتح') {
        await setGroupMode('not_announcement'); // فتح الشات
        await sock.sendMessage(groupJid, {
          text: `🔓 تم فتح الشات لمدة ${minutes} دقيقة${minutes > 1 ? 'ات' : ''}.`
        });

        if (timers.has(groupJid)) {
          clearTimeout(timers.get(groupJid));
        }

        // تعيين مؤقت لقفل الشات بعد انتهاء الوقت
        const timer = setTimeout(async () => {
          await setGroupMode('announcement'); // قفل الشات
          await sock.sendMessage(groupJid, {
            text: `🔒 تم قفل الشات تلقائياً بعد انتهاء المهلة.`
          });
          timers.delete(groupJid);
        }, minutes * 60 * 1000);

        timers.set(groupJid, timer);
      }

    } catch (error) {
      console.error('✗ خطأ في أمر شات توقيت:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ حدث خطأ أثناء تنفيذ الأمر:\n\n${error.message || error.toString()}`
      }, { quoted: msg });
    }
  }
};