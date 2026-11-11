const fs = require('fs');
const path = require('path');
const { isElite } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'groupLinkProtection.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}), 'utf8');

const loadProtectionData = () => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error('❌ فشل في قراءة ملف حماية الروابط:', err);
    return {};
  }
};

const saveProtectionData = (data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ فشل في حفظ ملف حماية الروابط:', err);
  }
};

const decode = (jid) => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

const warnings = {};
let linkHandlerAttached = false;

module.exports = {
  command: 'حماية_روابط',
  description: '🔒 تفعيل أو تعطيل حماية الروابط (حذف الروابط وإعطاء تحذيرات)',
  usage: '.حماية_روابط',
  category: 'إداري',

  async execute(sock, msg) {
    // التوثيق الوهمي بـ ASCA
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

    const groupJid = msg.key.remoteJid;
    const sender = decode(msg.key.participant || msg.key.remoteJid);

    if (!groupJid.endsWith('@g.us')) {
      return sock.sendMessage(groupJid, { 
        text: '❌ هذا الأمر خاص بالمجموعات فقط.' 
      }, { quoted: fakeOfficial });
    }

    if (!isElite(sender.split('@')[0])) {
      return sock.sendMessage(groupJid, { 
        text: '🚫 هذا الأمر للنخبة فقط.' 
      }, { quoted: fakeOfficial });
    }

    const protectionData = loadProtectionData();

    // قلب الحالة (تشغيل/إيقاف)
    if (protectionData[groupJid]) {
      delete protectionData[groupJid];
      saveProtectionData(protectionData);
      
      // حذف تحذيرات هذه المجموعة
      Object.keys(warnings).forEach(key => {
        if (key.includes(groupJid)) delete warnings[key];
      });
      
      return sock.sendMessage(groupJid, { 
        text: '✅ *تم تعطيل حماية الروابط*\n\n🔓 الآن يمكن للأعضاء إرسال الروابط.' 
      }, { quoted: fakeOfficial });
    }

    protectionData[groupJid] = {
      enabled: true,
      activatedAt: new Date().toISOString(),
      activatedBy: sender
    };
    
    saveProtectionData(protectionData);

    await sock.sendMessage(groupJid, { 
      text: '🔒 *تم تفعيل حماية الروابط*\n\n⚠️ سيتم:\n1. حذف أي رابط يرسل في المجموعة\n2. تحذير المرسل مع منشن\n3. لا يوجد طرد، فقط تحذيرات'
    }, { quoted: fakeOfficial });

    if (linkHandlerAttached) return;

    // إضافة مستمع الروابط
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const active = loadProtectionData();
      
      for (let m of messages) {
        if (!m.message || m.key.fromMe) continue;

        const group = m.key.remoteJid;
        if (!active[group] || !active[group].enabled) continue;

        const senderJid = m.key.participant || group;
        const senderKey = `${senderJid}_${group}`; // مفتاح فريد لكل مستخدم في كل مجموعة
        
        // استخراج النص من جميع أنواع الرسائل
        const text = m.message.conversation || 
                    m.message.extendedTextMessage?.text || 
                    m.message.imageMessage?.caption ||
                    m.message.videoMessage?.caption ||
                    m.message.documentMessage?.caption || '';

        // البحث عن روابط
        const containsLink = /(https?:\/\/[^\s]+)/i.test(text) || 
                            /(www\.[^\s]+)/i.test(text) ||
                            /(\.com|\.org|\.net|\.io|\.me)/i.test(text);

        if (containsLink) {
          // زيادة عدد التحذيرات
          warnings[senderKey] = (warnings[senderKey] || 0) + 1;

          // رسائل التحذير
          const warningMessages = [
            `⚠️ *تنبيه!* ⚠️\n@${senderJid.split('@')[0]} \nممنوع نشر الروابط في هذه المجموعة!\n(تحذير ${warnings[senderKey]}/∞)`,
            `🚫 *ممنوع الروابط!*\n@${senderJid.split('@')[0]} \nرابطك تم حذفه تلقائياً!\n(تحذير ${warnings[senderKey]}/∞)`,
            `📢 *انتباه!*\n@${senderJid.split('@')[0]} \nالمجموعة محمية من الروابط!\n(تحذير ${warnings[senderKey]}/∞)`,
            `🔗 *تم اكتشاف رابط!*\n@${senderJid.split('@')[0]} \nحافظ على نظافة المجموعة!\n(تحذير ${warnings[senderKey]}/∞)`
          ];
          
          const randomWarning = warningMessages[Math.floor(Math.random() * warningMessages.length)];

          // إرسال التحذير
          await sock.sendMessage(group, {
            text: randomWarning,
            mentions: [senderJid]
          }, { quoted: fakeOfficial });

          // حذف الرسالة الأصلية
          try {
            await sock.sendMessage(group, {
              delete: {
                remoteJid: group,
                fromMe: false,
                id: m.key.id,
                participant: senderJid
              }
            });
          } catch (err) {
            console.error('❌ فشل في حذف الرسالة:', err.message);
          }

          console.log(`🔗 حذف رابط من @${senderJid.split('@')[0]} في ${group} (تحذير ${warnings[senderKey]})`);
        }
      }
    });

    linkHandlerAttached = true;
    
    // رسالة تأكيد نهائية
    setTimeout(() => {
      sock.sendMessage(groupJid, { 
        text: '✅ *حماية الروابط جاهزة للعمل*\n\n🔍 الآن تتم مراقبة جميع الرسائل تلقائياً.'
      }, { quoted: fakeOfficial });
    }, 1000);
  }
};

// دالة للحصول على حالة المجموعات المحمية
module.exports.getProtectedGroups = () => {
  return loadProtectionData();
};

// دالة لمسح تحذيرات مستخدم معين
module.exports.resetWarnings = (userId, groupId) => {
  const key = `${userId}_${groupId}`;
  if (warnings[key]) {
    delete warnings[key];
    return true;
  }
  return false;
};