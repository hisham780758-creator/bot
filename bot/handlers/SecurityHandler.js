/**
 * SecurityHandler.js — رادار حماية التهديدات الفعلية (روابط تيليجرام والسبام - بدون كلمات مفتاحية)
 */
const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '../group_security_settings.json');
const alertConfigPath = path.join(__dirname, '../data/alert_group.json');

function getAlertGroup() {
    try {
        if (fs.existsSync(alertConfigPath)) {
            const data = JSON.parse(fs.readFileSync(alertConfigPath, 'utf8'));
            if (data && data.alertGroup) return data.alertGroup;
        }
    } catch (e) {}
    return '120363431048497309@g.us';
}

function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
    } catch (error) {}
    return {};
}

const ADD_WINDOW_MS = 10_000;
const ALERT_COOLDOWN_MS = 5_000;
const MAX_ADDITIONS_LIMIT = 3;

const addActivity = new Map();
const lastAlerts = new Map();

async function processActivity(sock, groupId, actor, count, typeName = 'إضافات') {
    const currentSettings = loadSettings();
    if (!currentSettings[groupId] || !currentSettings[groupId].enabled) return;

    const now = Date.now();
    const recent = (addActivity.get(groupId) || [])
        .filter(item => now - item.time <= ADD_WINDOW_MS);

    recent.push({ time: now, count: Math.max(count, 1), actor });
    addActivity.set(groupId, recent);

    const totalCount = recent.reduce((sum, item) => sum + item.count, 0);

    if (totalCount >= MAX_ADDITIONS_LIMIT) {
        const lastAlert = lastAlerts.get(groupId + typeName) || 0;
        if (now - lastAlert >= ALERT_COOLDOWN_MS) {
            lastAlerts.set(groupId + typeName, now);

            const violatorJid = actor && actor.includes('@') ? actor : null;
            const mentionText = violatorJid ? `@${violatorJid.split('@')[0]}` : (actor || 'غير معروف');

            let groupName = groupId;
            try {
                const meta = await sock.groupMetadata(groupId);
                groupName = meta.subject || groupId;
            } catch (e) {}

            const alertMsg = 
                `🚨 *رصد هجوم مكثف: ${typeName}*\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `📍 *المجموعة:* ${groupName}\n` +
                `👤 *المسبب / المنفذ:* ${mentionText}\n` +
                `📊 *العدد المرصود:* ${totalCount} عمليات خلال 10 ثوانٍ\n` +
                `⚠️ *تنبيه:* تم تسجيل هذا النشاط في رادار الحماية.\n` +
                `━━━━━━━━━━━━━━━━━━`;

            const ALERT_GROUP = getAlertGroup();
            await sock.sendMessage(ALERT_GROUP, {
                text: alertMsg,
                mentions: violatorJid ? [violatorJid] : []
            });
        }
    }
}

module.exports = {
    initSecurityListener(sock) {

        // 1. رصد هجمات الإضافات السريعة بالجروبات
        sock.ev.on('group-participants.update', async (event) => {
            try {
                if (!event?.id?.endsWith('@g.us')) return;
                
                if (event.action === 'add') {
                    processActivity(sock, event.id, event.authorPn || event.author || event.actor, event.participants?.length || 1, 'إضافة أعضاء');
                }
            } catch (error) {}
        });

        // 2. رصد هجمات إغراق طلبات الانضمام
        sock.ev.on('group.join-request', async (event) => {
            try {
                if (!event?.id?.endsWith('@g.us')) return;
                processActivity(sock, event.id, event.author || event.participant || event.setter, 1, 'طلبات انضمام');
            } catch (error) {}
        });

        // 3. رصد التهديدات الفعلية (روابط تيليجرام والرسائل المعاد توجيهها بكثرة)
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages?.[0];
                if (!msg || !msg.message || msg.key.fromMe) return;

                const remoteJid = msg.key.remoteJid;
                if (!remoteJid || !remoteJid.endsWith('@g.us')) return;

                const currentSettings = loadSettings();
                if (!currentSettings[remoteJid] || !currentSettings[remoteJid].enabled) return;

                const text = msg.message.conversation || 
                             msg.message.extendedTextMessage?.text || 
                             msg.message.imageMessage?.caption || 
                             msg.message.videoMessage?.caption || '';

                const sender = msg.key.participant || msg.key.remoteJid;
                if (!sender) return;

                const lowerText = text.toLowerCase();
                let attackType = null;

                // رصد روابط تيليجرام الفعلية فقط
                if (lowerText.includes('t.me/') || lowerText.includes('telegram.me/') || lowerText.includes('telegram.dog/')) {
                    attackType = '🔗 رابط تيليجرام / سيرفر تبشير';
                }
                // رصد الرسائل المزعجة المعاد توجيهها بكثرة
                else if (msg.message.extendedTextMessage?.contextInfo?.isForwarded) {
                    const score = msg.message.extendedTextMessage.contextInfo.forwardingScore || 0;
                    if (score > 3) {
                        attackType = `🔁 رسالة سبام معاد توجيهها (Score: ${score})`;
                    }
                }

                if (attackType) {
                    let groupName = remoteJid;
                    try {
                        const meta = await sock.groupMetadata(remoteJid);
                        groupName = meta.subject || remoteJid;
                    } catch (e) {}

                    const cleanNumber = sender.split('@')[0];
                    const alertMsg = 
                        `🚨 *رادار الحماية: رصد تهديد فعلي / انتهاك*\n` +
                        `━━━━━━━━━━━━━━━━━━\n` +
                        `📍 *المجموعة:* ${groupName}\n` +
                        `👤 *المرسل:* @${cleanNumber}\n` +
                        `🎯 *تصنيف الانتهاك:* ${attackType}\n` +
                        `📝 *محتوى الرسالة:* ${text.substring(0, 180) || '[محتوى وسائط]'}\n` +
                        `━━━━━━━━━━━━━━━━━━`;

                    const ALERT_GROUP = getAlertGroup();
                    await sock.sendMessage(ALERT_GROUP, {
                        text: alertMsg,
                        mentions: [sender]
                    });
                }

            } catch (error) {}
        });
        
        console.log('📡 [رادار الحماية] يعمل بتركيز على التهديدات الفعلية فقط.');
    }
};
