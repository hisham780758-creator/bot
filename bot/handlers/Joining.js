const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const statusPath = path.join(__dirname, '../data/join_status.json');
const processedPath = path.join(__dirname, '../data/processed_requests.json');

// ذاكرة مؤقتة في الـ RAM لضمان السرعة الفائقة وعدم التكرار
let memoryCache = null;

function isMonitoringEnabled() {
    try {
        if (fs.existsSync(statusPath)) {
            const data = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            return data.enabled !== false;
        }
    } catch {}
    return true;
}

function getProcessedCache() {
    if (memoryCache) return memoryCache;
    try {
        if (fs.existsSync(processedPath)) {
            memoryCache = JSON.parse(fs.readFileSync(processedPath, 'utf8'));
            if (Array.isArray(memoryCache)) return memoryCache;
        }
    } catch {}
    memoryCache = [];
    return memoryCache;
}

function saveProcessedCache(cache) {
    memoryCache = cache;
    try {
        const dir = path.dirname(processedPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(processedPath, JSON.stringify(cache, null, 2));
    } catch (e) {
        console.log('❌ خطأ في حفظ كاش طلبات الانضمام:', e.message);
    }
}

// الرابط المخصص لإرسال البلاغات لملف Joining.js فقط
async function getJoiningAlertGroup(sock) {
    const inviteLink = 'https://chat.whatsapp.com/B5oR3qGH8r4JMcN3LjtZaJ?s=cl&p=a&mlu=4&ilr=4&iam=2';
    try {
        const match = inviteLink.match(/chat\.whatsapp\.com\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            const inviteCode = match[1];
            const meta = await sock.groupGetInviteInfo(inviteCode);
            if (meta && meta.id) return meta.id;
        }
    } catch (e) {}
    return '120363431048497309@g.us';
}

module.exports = async function Joining(sock, m) {
    try {
        if (!isMonitoringEnabled()) return;
        if (!m || !m.messages) return;

        for (const msg of m.messages) {
            const groupId = msg.key?.remoteJid;
            if (!groupId || !groupId.endsWith('@g.us')) continue;

            const textContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const isJoinNotification = msg.messageStubType || textContent.includes('طلب') || textContent.includes('الانضمام');

            if (!isJoinNotification) continue;

            let pendingRequests = [];
            try {
                pendingRequests = await sock.groupRequestParticipantsList(groupId);
            } catch (err) {
                continue;
            }

            if (!Array.isArray(pendingRequests) || pendingRequests.length === 0) continue;

            let processedCache = getProcessedCache();
            let groupName = groupId;
            try {
                const meta = await sock.groupMetadata(groupId);
                groupName = meta.subject || groupId;
            } catch {}

            const targetJid = await getJoiningAlertGroup(sock);

            for (const req of pendingRequests) {
                const participantJid = req.jid || req.id || req.participant;
                if (!participantJid) continue;

                const normalized = jidNormalizedUser(participantJid);
                if (!normalized) continue;

                // 🛡️ فحص صارم لمنع التكرار نهائياً (إذا تم إرساله من قبل، يتم تخطيه فوراً)
                const cacheKey = `${groupId}_${normalized}`;
                if (processedCache.includes(cacheKey)) continue;

                const username = normalized.split('@')[0];

                let devicesCount = 0;
                let sessionStatus = '✅ حساب نظيف (بدون جلسات إضافية مسجلة)';

                try {
                    const devices = await sock.getUSyncDevices([normalized], false, false);
                    const deviceMap = new Map();

                    for (const device of devices || []) {
                        if (!device || typeof device.device !== 'number' || !device.user) continue;
                        const uname = String(device.user).split('@')[0];
                        if (!deviceMap.has(uname)) deviceMap.set(uname, []);
                        deviceMap.get(uname).push(device.device);
                    }

                    const deviceNumbers = deviceMap.get(username) || [];
                    const extraDevices = [...new Set(deviceNumbers.filter(device => device > 0))];
                    devicesCount = extraDevices.length;

                    if (devicesCount > 0) {
                        sessionStatus = `⚠️ يوجد جلسات/أجهزة مرتبطة من قبل (${devicesCount} جهاز إضافي)`;
                    }
                } catch (e) {
                    sessionStatus = '❓ تعذر التحقق من الجلسات السابقة';
                }

                const date = new Date().toLocaleString('en-GB', {
                    timeZone: 'Africa/Cairo',
                    hour12: false
                });

                const report =
`*⎔⋅• ━ ╼╃ ⌬〔 🪶 〕⌬ ╄╾ ━ •⋅*

*⌗˖￤اسـم الـجـروب⬿『 ${groupName} 』*
*⌗˖￤الـحـالـة⬿『 رصد طلب انضمام جديد ⚠️ 』*

*👤 「 @${username} 」⤹*
قدم طلب انضمام إلى المجموعة.

🔌 *تقرير فحص الجلسات والأجهزة:*
${sessionStatus}

*⎔⋅• ━ ╼╃ ⌬〔 🪶 〕⌬ ╄╾ ━ •⋅*
*🕒 ${date}*`;

                await sock.sendMessage(targetJid, {
                    text: report,
                    mentions: [normalized]
                });

                // حفظ المعرف في الذاكرة والملف لضمان عدم إرساله مرتين أبداً
                processedCache.push(cacheKey);
                if (processedCache.length > 1000) processedCache.shift();
                saveProcessedCache(processedCache);

                console.log(`✅ تم رصد طلب الانضمام وإرسال البلاغ مرة واحدة فقط للعضو (@${username}).`);
            }
        }
    } catch (e) {
        console.log('❌ خطأ في نظام فحص طلبات الانضمام:', e.message);
    }
};
