/**
 * تسجيل.js — أمر تفعيل وإلغاء حماية جهات الاتصال في المجموعة
 */
const fs = require('fs');
const path = require('path');
const { isElite } = require('../haykala/elite');

const contactsFile = path.join(__dirname, '../data/جهات.json');

function getEnabledChats() {
    try {
        if (!fs.existsSync(contactsFile)) {
            fs.writeFileSync(contactsFile, JSON.stringify([]));
        }
        return JSON.parse(fs.readFileSync(contactsFile, 'utf8'));
    } catch {
        return [];
    }
}

function saveEnabledChats(chats) {
    try {
        fs.writeFileSync(contactsFile, JSON.stringify(chats, null, 2));
        // تحديث الرام فوراً
        const antiContacts = require('../handlers/anti_contacts');
        if (antiContacts && antiContacts.reloadCache) {
            antiContacts.reloadCache();
        }
    } catch {}
}

module.exports = {
    command: ['تسجيل'],
    category: 'security',
    description: 'تفعيل أو تعطيل حماية جهات الاتصال في المجموعة الحالية',

    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid;
            if (!chatId?.endsWith('@g.us')) {
                return sock.sendMessage(chatId, { text: '🚫 هذا الأمر يعمل داخل المجموعات فقط.' }, { quoted: msg });
            }

            const senderJid = msg.key.participant || msg.participant || '';
            const senderNumber = senderJid.split('@')[0];
            if (!isElite(senderNumber)) {
                return;
            }

            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const lowerBody = body.trim().toLowerCase();
            
            let enabledChats = getEnabledChats();

            if (lowerBody.startsWith('.تسجيل') || lowerBody.includes('تشغيل')) {
                if (enabledChats.includes(chatId)) {
                    return sock.sendMessage(chatId, { text: '⚠️ هذا الجروب مسجل ومفعل مسبقاً في نظام الحماية.' }, { quoted: msg });
                }
                enabledChats.push(chatId);
                saveEnabledChats(enabledChats);
                return sock.sendMessage(chatId, { text: '❄️ تم تسجيل الجروب! حماية الجهات الآن تعمل بسرعة الرام الخارقة.' }, { quoted: msg });
            }

            if (lowerBody.startsWith('.إلغاء_تسجيل') || lowerBody.startsWith('.الغاء_تسجيل') || lowerBody.includes('ايقاف') || lowerBody.includes('إيقاف')) {
                if (!enabledChats.includes(chatId)) {
                    return sock.sendMessage(chatId, { text: '⚠️ الجروب غير مسجل في نظام الحماية أساساً.' }, { quoted: msg });
                }
                enabledChats = enabledChats.filter(id => id !== chatId);
                saveEnabledChats(enabledChats);
                return sock.sendMessage(chatId, { text: '🧊 تم إلغاء تسجيل الجروب وتعطيل الحماية فيه.' }, { quoted: msg });
            }

            return sock.sendMessage(chatId, {
                text: '💻 *طريقة الاستخدام:\n*• `.تسجيل` لتفعيل الحماية في الجروب الحالي\n• `.إلغاء_تسجيل` لتعطيل الحماية عن الجروب'
            }, { quoted: msg });

        } catch (err) {
            console.log('❌ خطأ في أمر التسجيل:', err);
        }
    }
};
