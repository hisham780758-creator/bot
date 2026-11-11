const fs = require('fs');

// إعدادات اللعبة
const gameSettings = {
  timeout: 60000,
  points: 500,
  dataFile: './src/game/كت.json'
};

// نظام بنك بسيط داخل الذاكرة (ممكن تطويره لاحقًا لتخزين في ملف)
const userPoints = {};

module.exports = {
  command: ['كت'],
  description: 'يرسل لك لغز عشوائي وتحصل على نقاط إن أجبت بشكل صحيح',
usage: '.كت',
  category: 'العاب',
  async execute(sock, msg) {
    sock.tekateki = sock.tekateki || {};
    const chatId = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;

    if (chatId in sock.tekateki) {
      await sock.sendMessage(chatId, {
        text: '⚠️ *｢❤️｣⇊ يوجد لغز نشط بالفعل!*! الرجاء الانتظار حتى ينتهي الوقت.',
      }, { quoted: sock.tekateki[chatId][0] });
      return;
    }

    try {
      const tekatekiData = JSON.parse(fs.readFileSync(gameSettings.dataFile));
      const randomQuestion = tekatekiData[Math.floor(Math.random() * tekatekiData.length)];

      const questionMessage = `
🎯 *السؤال*:
${randomQuestion.question}

👤 *اللاعب*: @${senderId.split('@')[0]}
⏳ *الوقت*: ${(gameSettings.timeout / 1000)} ثانية
🏆 *الجائزة*: ${gameSettings.points} نقطة

📌 *ملاحظة*: اكتب إجابتك في رسالة مباشرة
`.trim();

      const sentMsg = await sock.sendMessage(chatId, {
        text: questionMessage,
        mentions: [senderId],
      }, { quoted: msg });

      // حفظ اللغز النشط
      sock.tekateki[chatId] = {
        question: randomQuestion,
        sender: senderId,
        message: sentMsg,
        timeout: setTimeout(async () => {
          if (sock.tekateki[chatId]) {
            await sock.sendMessage(chatId, {
              text: `⌛ انتهى الوقت!\n\n✅ الإجابة الصحيحة كانت: ${randomQuestion.response}`,
            }, { quoted: sock.tekateki[chatId].message });
            delete sock.tekateki[chatId];
          }
        }, gameSettings.timeout)
      };

      // مراقبة الرسائل داخل نفس السياق
      sock.ev.on('messages.upsert', async ({ messages }) => {
        const incomingMsg = messages[0];
        const fromChat = incomingMsg.key.remoteJid;
        const text = incomingMsg.message?.conversation?.trim();

        if (!text || !(fromChat in sock.tekateki)) return;

        const game = sock.tekateki[fromChat];

        // التحقق من المرسل وصحة الإجابة
        if ((incomingMsg.key.participant || incomingMsg.key.remoteJid) === game.sender) {
          if (text.toLowerCase() === game.question.response.toLowerCase()) {
            clearTimeout(game.timeout);

            userPoints[game.sender] = (userPoints[game.sender] || 0) + gameSettings.points;

            await sock.sendMessage(fromChat, {
              text: `🎉 أحسنت! إجابتك صحيحة ✅\n\n🏆 تم منحك ${gameSettings.points} نقطة!`,
            }, { quoted: incomingMsg });

            delete sock.tekateki[fromChat];
          }
        }
      });

    } catch (error) {
      console.error('حدث خطأ في لعبة الألغاز:', error);
      await sock.sendMessage(chatId, {
        text: '❌ حدث خطأ في تحميل الأسئلة! الرجاء المحاولة لاحقاً.',
      }, { quoted: msg });
    }
  }
};