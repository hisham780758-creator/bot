const BATCH_SIZE = 15;

// ===============================
// استخراج نص الرسالة المردود عليها
// ===============================

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

function getQuotedText(msg) {

  // دعم بعض الهاندلرات التي توفر quoted مباشرة
  if (msg.quoted) {

    if (typeof msg.quoted.text === 'string') {
      return msg.quoted.text;
    }

    if (typeof msg.quoted.body === 'string') {
      return msg.quoted.body;
    }

    if (msg.quoted.message) {

      const text =
        getMessageText(
          msg.quoted.message
        );

      if (text) return text;
    }
  }

  // استخراج الرسالة المردود عليها من Baileys
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

// ===============================
// استخراج منشنات الرسالة المقتبسة
// ===============================

function getQuotedMentions(msg) {

  const contextInfo =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo;

  if (!contextInfo?.quotedMessage) {
    return [];
  }

  const quotedMessage =
    contextInfo.quotedMessage;

  const quotedContext =
    quotedMessage.extendedTextMessage?.contextInfo ||
    quotedMessage.imageMessage?.contextInfo ||
    quotedMessage.videoMessage?.contextInfo ||
    quotedMessage.documentMessage?.contextInfo;

  if (!quotedContext?.mentionedJid) {
    return [];
  }

  return [
    ...new Set(
      quotedContext.mentionedJid
    )
  ];
}

// ===============================
// تحويل JID / LID إلى رقم حقيقي
// ===============================

async function resolveMentionToNumber(sock, jid) {

  if (!jid) return null;

  const cleanJid =
    String(jid).split(':')[0];

  // --------------------------------
  // إذا كان المنشن أصلاً برقم
  // --------------------------------

  if (
    cleanJid.endsWith('@s.whatsapp.net')
  ) {

    const number =
      cleanJid
        .replace('@s.whatsapp.net', '')
        .replace(/\D/g, '');

    if (
      number.length >= 8 &&
      number.length <= 15
    ) {
      return number;
    }

    return null;
  }

  // --------------------------------
  // إذا كان المنشن LID
  // نحاول تحويله إلى الرقم الحقيقي
  // --------------------------------

  if (
    cleanJid.endsWith('@lid')
  ) {

    try {

      const mapping =
        sock.signalRepository?.lidMapping;

      if (
        mapping &&
        typeof mapping.getPNForLID === 'function'
      ) {

        const pn =
          await mapping.getPNForLID(
            cleanJid
          );

        if (pn) {

          const number =
            String(pn)
              .split(':')[0]
              .replace('@s.whatsapp.net', '')
              .replace(/\D/g, '');

          if (
            number.length >= 8 &&
            number.length <= 15
          ) {
            return number;
          }
        }
      }

    } catch (error) {

      console.log(
        'تعذر تحويل LID إلى رقم:',
        cleanJid,
        error.message
      );
    }
  }

  return null;
}

// ===============================
// تنظيف رقم الهاتف
// ===============================

function normalizeNumber(value) {

  if (!value) return null;

  let number =
    String(value).trim();

  // نحذف كل شيء ما عدا الأرقام
  number =
    number.replace(/\D/g, '');

  // رقم دولي منطقي
  if (
    number.length < 8 ||
    number.length > 15
  ) {
    return null;
  }

  return number;
}

// ===============================
// استخراج الأرقام من النص
// ===============================

function extractNumbers(text) {

  if (!text) return [];

  const found = [];

  const lines =
    text.split(/\r?\n/);

  for (const line of lines) {

    // نبحث عن رقم يبدأ بـ +
    // ويمتد خلال المسافات والشرطات والأقواس
    const matches =
      line.match(
        /\+\d[\d\s().-]*\d/g
      );

    if (!matches) continue;

    for (const match of matches) {

      const number =
        normalizeNumber(match);

      if (!number) continue;

      found.push(number);
    }
  }

  // إزالة التكرار داخل نفس الرسالة فقط
  return [
    ...new Set(found)
  ];
}

// ===============================
// إنشاء VCard
// ===============================

function createVCard(name, number) {

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    `TEL;type=CELL;type=VOICE;waid=${number}:${number}`,
    'END:VCARD'
  ].join('\n');
}

// ===============================
// البلجن
// ===============================

module.exports = {

  command: 'سجل',

  category: 'tools',

  description:
    'تحويل أرقام ومنشنات الرسالة المقتبسة إلى جهات اتصال',

  async execute(sock, msg) {

    const chatId =
      msg.key.remoteJid;

    const sender =
      msg.key.participant ||
      msg.participant ||
      msg.key.remoteJid;

    try {

      // -------------------------------
      // اسم الجهات
      // -------------------------------

      const args =
        Array.isArray(msg.args)
          ? msg.args
          : [];

      const contactTitle =
        args.length
          ? args.join(' ').trim()
          : 'مؤبد زرف';

      // -------------------------------
      // الرسالة المقتبسة
      // -------------------------------

      const quotedText =
        getQuotedText(msg);

      if (!quotedText) {

        return sock.sendMessage(
          chatId,
          {
            text:
              '*✧═════ 𝒇𝒓𝒐𝒔𝒕 𝒂𝒅𝒎𝒊𝒏 ═════✧*\n' +
              '*✧═════•❁❄️❁•═════✧*\n' +
              '✧❄️❯ رد على الرسالة التي تحتوي على الأرقام أو المنشنات واكتب:\n\n' +
              '✧❄️❯ .سجل مؤبد زرف\n' +
              '*✧═════•❁❄️❁•═════✧*'
          },
          { quoted: msg }
        );
      }

      // -------------------------------
      // استخراج الأرقام
      // -------------------------------

      const numbers =
        extractNumbers(quotedText);

      // -------------------------------
      // استخراج المنشنات
      // -------------------------------

      const mentionedJids =
        getQuotedMentions(msg);

      // -------------------------------
      // تحويل المنشنات إلى أرقام حقيقية
      // -------------------------------

      const mentionNumbers = [];

      let unresolvedMentions = 0;

      for (const jid of mentionedJids) {

        const number =
          await resolveMentionToNumber(
            sock,
            jid
          );

        if (
          number &&
          !mentionNumbers.includes(number)
        ) {

          mentionNumbers.push(number);

        } else if (!number) {

          unresolvedMentions++;
        }
      }

      // -------------------------------
      // دمج الأرقام + أرقام المنشنات
      // -------------------------------

      const allNumbers = [
        ...numbers,
        ...mentionNumbers
      ];

      // -------------------------------
      // إزالة التكرارات داخل هذه العملية فقط
      // -------------------------------

      const uniqueNumbers =
        [...new Set(allNumbers)];

      if (!uniqueNumbers.length) {

        return sock.sendMessage(
          chatId,
          {
            text:
              '*✧═════ 𝒇𝒓𝒐𝒔𝒕 𝒂𝒅𝒎𝒊𝒏 ═════✧*\n' +
              '*✧═════•❁❄️❁•═════✧*\n' +
              '✧❄️❯ لم أجد أرقام هواتف قابلة للتحويل في الرسالة أو المنشنات.\n' +
              '*✧═════•❁❄️❁•═════✧*'
          },
          { quoted: msg }
        );
      }

      const duplicates =
        allNumbers.length -
        uniqueNumbers.length;

      // -------------------------------
      // إنشاء أرقام الأسماء
      // يبدأ من 001 في كل عملية جديدة
      // -------------------------------

      const contacts = [];

      let counter = 0;

      for (const number of uniqueNumbers) {

        counter++;

        const numberName =
          `${contactTitle} ${String(counter).padStart(3, '0')}`;

        contacts.push({
          number,
          name: numberName,
          vcard: createVCard(
            numberName,
            number
          )
        });
      }

      // -------------------------------
      // تقسيم إلى حزم 15
      // -------------------------------

      const batches = [];

      for (
        let i = 0;
        i < contacts.length;
        i += BATCH_SIZE
      ) {

        batches.push(
          contacts.slice(
            i,
            i + BATCH_SIZE
          )
        );
      }

      // -------------------------------
      // إرسال للخاص
      // -------------------------------

      let sent = 0;

      for (
        let batchIndex = 0;
        batchIndex < batches.length;
        batchIndex++
      ) {

        const batch =
          batches[batchIndex];

        await sock.sendMessage(
          sender,
          {
            contacts: {
              displayName:
                `${contactTitle} — ${batchIndex + 1}/${batches.length}`,

              contacts:
                batch.map(contact => ({
                  displayName:
                    contact.name,

                  vcard:
                    contact.vcard
                }))
            }
          }
        );

        sent += batch.length;

        // تأخير بسيط بين الحزم
        if (
          batchIndex <
          batches.length - 1
        ) {

          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                1500
              )
          );
        }
      }

      // -------------------------------
      // تقرير العملية
      // -------------------------------

      await sock.sendMessage(
        sender,
        {
          text:
            '*✧═════ 𝒇𝒓𝒐𝒔𝒕 𝒂𝒅𝒎𝒊𝒏 ═════✧*\n' +
            `✧❄️❯ تم تجهيز جهات الاتصال بنجاح\n\n` +
            `✧❄️❯ الاسم: ${contactTitle}\n` +
            `✧❄️❯ الأرقام: ${uniqueNumbers.length}\n` +
            `✧❄️❯ المنشنات: ${mentionedJids.length}\n` +
            `✧❄️❯ المنشنات الفاشله: ${unresolvedMentions}\n` +
            `✧❄️❯ المكررة في نفس الرسالة: ${duplicates}\n` +
            `✧❄️❯ الحزم: ${batches.length}\n` +
            `✧❄️❯ الحد الأقصى للحزمة: ${BATCH_SIZE}\n\n` +
            `✧❄️❯ تم إرسال: ${sent} جهة اتصال\n` +
            '*✧═════•❁❄️❁•═════✧*'
        }
      );

    } catch (error) {

      console.error(
        '❌ خطأ في أمر سجل:',
        error
      );

      return sock.sendMessage(
        chatId,
        {
          text:
            '*✧═════ 𝒇𝒓𝒐𝒔𝒕 𝒂𝒅𝒎𝒊𝒏 ═════✧*\n' +
            '*✧═════•❁❄️❁•═════✧*\n' +
            '✧❄️❯ حدث خطأ أثناء تجهيز جهات الاتصال.\n\n' +
            `✧❄️❯ ${error.message || error}\n` +
            '*✧═════•❁❄️❁•═════✧*'
        },
        { quoted: msg }
      );
    }
  }
};