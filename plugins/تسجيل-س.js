/**
 * تسجيل-س.js — أمر تفعيل وإلغاء رادار السياحة في المجموعة
 */
const fs = require('fs');
const path = require('path');
const { isElite } = require('../haykala/elite');

const tourismFile = path.join(__dirname, '../data/tourism_registered_groups.json');

function getRegisteredGroups() {
    try {
        if (!fs.existsSync(tourismFile)) {
            fs.writeFileSync(tourismFile, JSON.stringify([]));
        }
        return JSON.parse(fs.readFileSync(tourismFile, 'utf8'));
    } catch {
        return [];
    }
}

function saveRegisteredGroups(groups) {
    try {
        fs.writeFileSync(tourismFile, JSON.stringify(groups, null, 2));
        // تحديث الكاش في الرام فوراً
        const antiTourism = require('../handlers/anti_tourism');
        if (antiTourism && antiTourism.reloadCache) {
            antiTourism.reloadCache();
        }
    } catch {}
}

module.exports = {
    command: ['تسجيل-س'],
    category: 'security',
    description: 'تفعيل أو تعطيل رادار كشف السياحة في المجموعة الحالية',

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
            
            let registeredGroups = getRegisteredGroups();

            if (lowerBody.startsWith('.تسجيل-س') || lowerBody.startsWith('.تسجيل_س') || lowerBody.includes('تشغيل-س')) {
                if (registeredGroups.includes(chatId)) {
                    return sock.sendMessage(chatId, { text: '⚠️ هذا الجروب مسجل ومفعل مسبقاً في رادار السياحة.' }, { quoted: msg });
                }
                registeredGroups.push(chatId);
                saveRegisteredGroups(registeredGroups);
                return sock.sendMessage(chatId, { text: '🪶 تم تسجيل الجروب! رادار السياحة يعمل بكفاءة تامة.' }, { quoted: msg });
            }

            if (lowerBody.startsWith('.إلغاء_تسجيل-س') || lowerBody.startsWith('.الغاء_تسجيل-س') || lowerBody.startsWith('.إلغاء-تسجيل-س') || lowerBody.includes('ايقاف-س')) {
                if (!registeredGroups.includes(chatId)) {
                    return sock.sendMessage(chatId, { text: '⚠️ الجروب غير مسجل في رادار السياحة أساساً.' }, { quoted: msg });
                }
                registeredGroups = registeredGroups.filter(id => id !== chatId);
                saveRegisteredGroups(registeredGroups);
                return sock.sendMessage(chatId, { text: '🪶 تم إلغاء تسجيل الجروب وتعطيل رادار السياحة فيه.' }, { quoted: msg });
            }

            return sock.sendMessage(chatId, {
                text: '💻 *طريقة الاستخدام:\n*• `.تسجيل-س` لتفعيل رادار السياحة في الجروب الحالي\n• `.إلغاء_تسجيل-س` لتعطيل رادار السياحة عن الجروب'
            }, { quoted: msg });

        } catch (err) {
            console.log('❌ خطأ في أمر تسجيل-س:', err);
        }
    }
};
