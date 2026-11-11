const animals = [
  { "emoji": "🐪", "name": "جمل" },
  { "emoji": "🐁", "name": "فأر" },
  { "emoji": "🐑", "name": "خروف" },
  { "emoji": "🐘", "name": "فيل" },
  { "emoji": "🦅", "name": "نسر" },
  { "emoji": "🐈‍⬛", "name": "قط" },
  { "emoji": "🐕", "name": "كلب" },
  { "emoji": "🐎", "name": "حصان" },
  { "emoji": "🐒", "name": "قرد" },
  { "emoji": "🐩", "name": "كلب" },
  { "emoji": "🫏", "name": "حمار" },
  { "emoji": "🐄", "name": "بقرة" },
  { "emoji": "🐜", "name": "نملة" },
  { "emoji": "🕷", "name": "عنكبوت" },
  { "emoji": "🐓", "name": "ديك" },
  { "emoji": "🐖", "name": "خنزير" },
  { "emoji": "🐇", "name": "ارنب" },
  { "emoji": "🐊", "name": "تمساح" },
  { "emoji": "🦋", "name": "فراشة" },
  { "emoji": "🪳", "name": "صرصور" }
];

// نخزن الألعاب النشطة
const activeGames = new Map();

module.exports = {
  command: 'حيوانات',
  description: 'فعالية خمن اسم الحيوان من الإيموجي 🐾',
  usage: '.حيوانات',
  category: 'فعاليات',

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

    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    try {
      // نتأكد مافي لعبة نشطة
      if (activeGames.has(jid)) {
        return await sock.sendMessage(jid, {
          text: '⚠️ هناك فعالية حيوانات جارية حالياً!'
        }, { quoted: fakeOfficial });
      }

      // نختار حيوان عشوائي
      const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
      
      // نخزن معلومات اللعبة
      activeGames.set(jid, {
        animal: randomAnimal,
        startTime: Date.now(),
        answered: false
      });

      // نرسل السؤال
      await sock.sendMessage(jid, {
        text: `🎮 *فعالية خمن الحيوان* 🐾\n\n${randomAnimal.emoji} *خمن اسم هذا الحيوان!*\n\n✏️ اكتب اسم الحيوان في المجموعة خلال 30 ثانية!`
      }, { quoted: fakeOfficial });

      // نضيف مستمع للإجابات
      const gameListener = async (m) => {
        if (m.key.remoteJid !== jid) return;
        
        const game = activeGames.get(jid);
        if (!game || game.answered) return;

        const userAnswer = m.message?.conversation?.toLowerCase().trim();
        const correctAnswer = game.animal.name.toLowerCase();

        if (userAnswer === correctAnswer) {
          game.answered = true;
          const timeTaken = Math.floor((Date.now() - game.startTime) / 1000);
          
          await sock.sendMessage(jid, {
            text: `🎉 *أحسنت!* 🎉\n\n✅ الإجابة صحيحة: *${game.animal.name}*\n⏰ الوقت: ${timeTaken} ثانية\n👤 الفائز: @${m.key.participant?.split('@')[0]}`,
            mentions: [m.key.participant]
          }, { quoted: fakeOfficial });
          
          // نحذف المستمع بعد الإجابة الصحيحة
          sock.ev.off('messages.upsert', gameListener);
          activeGames.delete(jid);
        }
      };

      // نضيف المستمع للإجابات
      sock.ev.on('messages.upsert', gameListener);

      // وقت انتهاء اللعبة بعد 30 ثانية
      setTimeout(() => {
        const game = activeGames.get(jid);
        if (game && !game.answered) {
          sock.sendMessage(jid, {
            text: `⏰ *انتهى الوقت!*\n\n❌ ما حد عرف الجواب!\n🐾 الإجابة كانت: *${game.animal.name}*`
          }, { quoted: fakeOfficial });
          
          sock.ev.off('messages.upsert', gameListener);
          activeGames.delete(jid);
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Error in حيوانات command:', error);
      activeGames.delete(jid);
      await sock.sendMessage(jid, {
        text: `❌ حدث خطأ: ${error.message}`
      }, { quoted: fakeOfficial });
    }
  }
};