/**
 * anti_contacts.js — معالج الحذف والطرد الفوري لجهات الاتصال (أقصى سرعة بالذاكرة العشوائية RAM)
 */
const fs = require('fs');
const path = require('path');

const contactsFile = path.join(__dirname, '../data/جهات.json');
const alertConfigPath = path.join(__dirname, '../data/alert_group.json');

// ذاكرة عشوائية فائقة السرعة
const enabledChatsSet = new Set();
let cachedAlertGroup = '120363431048497309@g.us';

function loadCache() {
    try {
        if (fs.existsSync(contactsFile)) {
            const chats = JSON.parse(fs.readFileSync(contactsFile, 'utf8'));
            enabledChatsSet.clear();
            if (Array.isArray(chats)) {
                chats.forEach(id => enabledChatsSet.add(id));
            }
        }
    } catch (e) {}

    try {
        if (fs.existsSync(alertConfigPath)) {
            const data = JSON.parse(fs.readFileSync(alertConfigPath, 'utf8'));
            if (data && data.alertGroup) cachedAlertGroup = data.alertGroup;
        }
    } catch (e) {}
}

// تحميل أولي للذاكرة
loadCache();

/**
 * دالة شمولية للتحقق من وجود جهة اتصال بأي صيغة أو هرمية داخل حزمة الرسالة
 */
function isVCardMessage(msgObj) {
    if (!msgObj) return false;

    // استخراج الرسالة الحقيقية في حال كانت مؤقتة أو موجهة أو View Once
    const message = 
        msgObj.ephemeralMessage?.message || 
        msgObj.viewOnceMessage?.message || 
        msgObj.viewOnceMessageV2?.message || 
        msgObj;

    // 1. بطاقة فردية
    if (message.contactMessage) return true;

    // 2. بطاقات متعددة
    if (message.contactsArrayMessage) return true;

    // 3. جهة اتصال مرسلة كملف vcf أو vcard
    if (message.documentMessage) {
        const mime = message.documentMessage.mimetype || '';
        const fileName = message.documentMessage.fileName || '';
        if (
            mime.includes('vcard') || 
            mime.includes('x-vcard') || 
            mime.includes('text/directory') ||
            fileName.endsWith('.vcf')
        ) {
            return true;
        }
    }

    return false;
}

module.exports = {
    reloadCache: loadCache,

    initAntiContacts(sock) {
        // الربط المباشر بحدث الاستقبال
        sock.ev.on('messages.upsert', (m) => {
            try {
                const messages = m.messages;
                if (!messages || messages.length === 0) return;

                // معالجة سريعة لكل الرسائل الواردة بالحزمة
                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    if (!msg || !msg.message || msg.key.fromMe) continue;

                    const chatId = msg.key.remoteJid;
                    if (!chatId || !chatId.endsWith('@g.us')) continue;

                    // فحص لحظي بالـ RAM (0.0001ms)
                    if (!enabledChatsSet.has(chatId)) continue;

                    // فحص وجود بطاقات الاتصال بكل الأشكال
                    if (!isVCardMessage(msg.message)) continue;

                    const sender = msg.key.participant || msg.key.remoteJid;
                    if (!sender) continue;

                    // ⚡⚡⚡ 1. إطلاق أمر الحذف اللحظي في أجزاء من الملي ثانية ⚡⚡⚡
                    sock.sendMessage(chatId, { delete: msg.key }).catch(() => {});

                    // ⚡⚡⚡ 2. تنفيذ القفل والطرد في الخلفية بدون تأخير الحذف ⚡⚡⚡
                    Promise.all([
                        // إغلاق الشات للمشرفين
                        sock.groupSettingUpdate(chatId, 'announcement', true).catch(() => {}),
                        
                        // طرد المخالف فوراً
                        sock.groupParticipantsUpdate(chatId, [sender], 'remove').catch(() => {})
                    ]).then(async () => {
                        // إرسال تقرير الإشعار إلى جروب الإشعارات
                        let groupName = chatId;
                        try {
                            const meta = await sock.groupMetadata(chatId);
                            groupName = meta.subject || chatId;
                        } catch (e) {}

                        const date = new Date().toLocaleString('en-GB', {
                            timeZone: 'Africa/Cairo',
                            hour12: false
                        });

                        const username = sender.split('@')[0];

                        sock.sendMessage(cachedAlertGroup, {
                            text: 
`*⎔⋅• ━ ╼╃ ⌬〔 🪶 〕⌬ ╄╾ ━ •⋅*

*⌗˖￤اسـم الـجـروب⬿『 ${groupName} 』*
*⌗˖￤الـحـالـة⬿『 طرد مرسل جهات اتصال 🚨 』*

*👤 「 @${username} 」⤹*
تم سحق المخالف وحذف جهة الاتصال فوراً بفضل الحماية الخارقة.

*⎔⋅• ━ ╼╃ ⌬〔 🪶 〕⌬ ╄╾ ━ •⋅*
*🕒 ${date}*`,
                            mentions: [sender]
                        }).catch(() => {});
                    }).catch(() => {});
                }
            } catch (err) {}
        });

        console.log('⚡ [anti_contacts الخارق] يعمل بسرعة الضوء ولن تفلته أي جهة اتصال.');
    }
};
