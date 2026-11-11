const fs = require('fs');
const path = require('path');
const { eliteNumbers } = require('../haykala/elite.js'); // ✅ استيراد النخبة

module.exports = {
  command: ['اضافه'],
  description: 'إضافة أوامر جديدة للبوت عند منشن الرسالة وإنشاء اسم ملف تلقائيًا.',
usage: '.اضافه اوامر',
  category: 'tools',

  async execute(sock, msg, args = []) {
    // ✅ التحقق من رقم المستخدم
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    if (!eliteNumbers.includes(senderNumber)) {
      return await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ هذا الأمر مخصص للنخبة فقط.',
      }, { quoted: msg });
    }

    const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quotedMessage || !quotedMessage.conversation) {
      return await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ يرجى منشن الرسالة التي تحتوي على الكود بعد كتابة "إضافة".',
      }, { quoted: msg });
    }

    let pluginCode = quotedMessage.conversation.trim();
    if (!pluginCode) {
      return await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ لم يتم تقديم أي كود لإضافته كأمر للبوت.',
      }, { quoted: msg });
    }

    // إضافة category إذا غير موجودة
    if (!pluginCode.includes('category')) {
      pluginCode = pluginCode.replace(
        'module.exports = {',
        `module.exports = {\n  category: 'tools',`
      );
    }

    // استخراج الاسم من نص الرسالة
    const fullText =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';
    
    let pluginFileName = '';
    const parts = fullText.trim().split(/\s+/);

    if (parts.length > 1) {
      const rawName = parts.slice(1).join('-').replace(/[^a-zA-Z0-9-_أ-ي]/g, '');
      pluginFileName = `${rawName}.js`;
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      pluginFileName = `plugin_${timestamp}.js`;
    }

    const pluginFilePath = path.resolve(`./plugins/${pluginFileName}`);

    try {
      fs.writeFileSync(pluginFilePath, pluginCode);

      await sock.sendMessage(msg.key.remoteJid, {
        text: `✔️ تم إنشاء البلجن وحفظه باسم: ${pluginFileName}`,
      }, { quoted: msg });

    } catch (error) {
      console.error('خطأ أثناء كتابة البلجن:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ حدث خطأ أثناء حفظ البلجن.',
      }, { quoted: msg });
    }
  }
};