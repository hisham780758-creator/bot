module.exports = {
  command: 'حولهم',
  category: 'ادوات',
  description: 'تحويل أرقام الرسالة المقتبسة إلى منشنات',

  async execute(sock, msg, args = []) {
    const chatId = msg.key.remoteJid;

    try {
      function getMessageText(message) {
        if (!message) return '';

        if (message.conversation) {
          return message.conversation;
        }

        if (message.extendedTextMessage?.text) {
          return message.extendedTextMessage.text;
        }

        if (message.imageMessage?.caption) {
          return message.imageMessage.caption;
        }

        if (message.videoMessage?.caption) {
          return message.videoMessage.caption;
        }

        if (message.documentMessage?.caption) {
          return message.documentMessage.caption;
        }

        return '';
      }

      function getQuotedText() {
        if (msg.quoted) {
          if (typeof msg.quoted.text === 'string') {
            return msg.quoted.text;
          }

          if (typeof msg.quoted.body === 'string') {
            return msg.quoted.body;
          }

          if (msg.quoted.message) {
            const text = getMessageText(msg.quoted.message);

            if (text) {
              return text;
            }
          }
        }

        const contextInfo =
          msg.message?.extendedTextMessage?.contextInfo ||
          msg.message?.imageMessage?.contextInfo ||
          msg.message?.videoMessage?.contextInfo ||
          msg.message?.documentMessage?.contextInfo;

        if (!contextInfo?.quotedMessage) {
          return '';
        }

        return getMessageText(
          contextInfo.quotedMessage
        );
      }

      function normalizeNumber(value) {
        if (!value) return null;

        let number = String(value)
          .trim()
          .replace(/\D/g, '');

        if (
          number.length < 8 ||
          number.length > 15
        ) {
          return null;
        }

        return number;
      }

      function extractNumbers(text) {
        if (!text) return [];

        const found = [];
        const lines = text.split(/\r?\n/);

        for (const line of lines) {
          const matches =
            line.match(/\+?\d[\d\s().-]*\d/g);

          if (!matches) continue;

          for (const match of matches) {
            const number =
              normalizeNumber(match);

            if (!number) continue;

            found.push(number);
          }
        }

        return [...new Set(found)];
      }

      const quotedText =
        getQuotedText();

      if (!quotedText) {
        return sock.sendMessage(
          chatId,
          {
            text:
              '*✧❄️❯ رد على الرسالة التي تحتوي على الأرقام واكتب .سجلهم*'
          },
          { quoted: msg }
        );
      }

      const numbers =
        extractNumbers(quotedText);

      if (!numbers.length) {
        return sock.sendMessage(
          chatId,
          {
            text:
              '*✧❄️❯ لم أجد أرقام هواتف في الرسالة*'
          },
          { quoted: msg }
        );
      }

      const mentions =
        numbers.map(
          number =>
            `${number}@s.whatsapp.net`
        );

      const mentionText =
        numbers
          .map(
            (number, index) =>
              `${index + 1}. @${number}`
          )
          .join('\n');

      const text =
        '*✧═════•❁❄️❁•═════✧*\n' +
        '✧❄️❯ *تسجيل المنشنات*\n' +
        '*✧═════•❁❄️❁•═════✧*\n' +
        mentionText +
        '\n' +
        '*✧═════•❁❄️❁•═════✧*\n' +
        `✧❄️❯ الإجمالي: ${numbers.length}\n` +
        '*✧═════•❁❄️❁•═════✧*';

      await sock.sendMessage(
        chatId,
        {
          text,
          mentions
        },
        { quoted: msg }
      );

      await sock.sendMessage(
        chatId,
        {
          react: {
            text: '❄️',
            key: msg.key
          }
        }
      );

    } catch (error) {
      console.error(
        '❌ خطأ في أمر سجلهم:',
        error
      );

      return sock.sendMessage(
        chatId,
        {
          text:
            `*✧❄️❯ حدث خطأ أثناء تنفيذ الأمر*\n` +
            `*✧❄️❯ ${error.message || error}*`
        },
        { quoted: msg }
      );
    }
  }
};