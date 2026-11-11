const path = require('path');
const fs = require('fs');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

const SNAPSHOT_PATH = path.join(__dirname, '../data/device_snapshot.json');
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

const BATCH_SIZE = 10;
const BATCH_DELAY = 2500; // تأخير مريح لمنع ضغط السيرفر وحظر 429

function loadSnapshot() {
    try {
        if (!fs.existsSync(SNAPSHOT_PATH)) return {};
        return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
    } catch { return {}; }
}

function saveSnapshot(data) {
    try {
        const dir = path.dirname(SNAPSHOT_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(data, null, 2));
    } catch (e) {}
}

async function checkBatch(sock, jids) {
    const result = new Map();
    try {
        const devices = await sock.getUSyncDevices(jids, false, false);
        const deviceMap = new Map();

        for (const device of devices || []) {
            if (!device || typeof device.device !== 'number' || !device.user) continue;
            
            const userStr = String(device.user);
            if (userStr.includes('@lid') || userStr.length > 15) continue;

            const username = userStr.split('@')[0].replace(/[^0-9]/g, '');
            if (!username || username.length < 7) continue;

            if (!deviceMap.has(username)) deviceMap.set(username, []);
            deviceMap.get(username).push(device.device);
        }

        for (const jid of jids) {
            const cleanJid = jid.split('@')[0].replace(/[^0-9]/g, '');
            const deviceNumbers = deviceMap.get(cleanJid) || [];
            const extraCount = new Set(deviceNumbers.filter(d => d > 0)).size;
            result.set(cleanJid, extraCount);
        }
    } catch (e) {}
    return result;
}

async function runScan(sock) {
    try {
        const allGroups = await sock.groupFetchAllParticipating();
        const snapshot = loadSnapshot();
        const newSnapshot = { ...snapshot };
        const ALERT_GROUP = getAlertGroup();

        for (const [groupId, groupData] of Object.entries(allGroups)) {
            const groupName = groupData.subject || groupId;
            const members = groupData.participants || [];
            const jids = [];
            const seen = new Set();

            for (const p of members) {
                const jid = p.id || p.jid || p;
                if (!jid || String(jid).includes('@lid')) continue;
                try {
                    const norm = jidNormalizedUser(jid);
                    if (norm && !seen.has(norm)) {
                        seen.add(norm);
                        jids.push(norm);
                    }
                } catch {}
            }

            for (let i = 0; i < jids.length; i += BATCH_SIZE) {
                const batch = jids.slice(i, i + BATCH_SIZE);
                const batchResult = await checkBatch(sock, batch);

                for (const [number, extraCount] of batchResult) {
                    const prev = snapshot[number] !== undefined ? snapshot[number] : 0;
                    newSnapshot[number] = extraCount;

                    // الشرط الأساسي الذي طلبته: كان بدون جهاز (prev === 0) وأصبح لديه جهاز/بوت الآن (extraCount > 0)
                    if (prev === 0 && extraCount > 0) {
                        const targetJid = jidNormalizedUser(`${number}@s.whatsapp.net`);
                        const date = new Date().toLocaleString('en-GB', {
                            timeZone: 'Africa/Cairo',
                            hour12: false
                        });

                        const msg = 
`*⎔⋅• ━ ╼╃ ⌬〔 🪶 〕⌬ ╄╾ ━ •⋅*

*⌗˖￤اسـم الـجـروب⬿『 ${groupName} 』*
*⌗˖￤الـحـالـة⬿『 رصد ربط جلسة / بوت جديد بعد الانضمام 🚨 』*

*👤 「 @${number} 」⤹*
*⌗˖￤التصنيف⬿『 العضو قام بربط بوت/جلسة جديدة داخل الجروب 🟢 』*
*⌗˖￤الأجهزة السابقة⬿『 ${prev} 』*
*⌗˖￤الأجهزة الحالية⬿『 ${extraCount} 』*

*⎔⋅• ━ ╼╃ ⌬〔 🪶 〕⌬ ╄╾ ━ •⋅*
*🕒 ${date}*`;

                        try {
                            await sock.sendMessage(ALERT_GROUP, {
                                text: msg,
                                mentions: [targetJid]
                            });
                        } catch (e) {}
                    }
                }

                if (i + BATCH_SIZE < jids.length) {
                    await new Promise(r => setTimeout(r, BATCH_DELAY));
                }
            }
        }
        saveSnapshot(newSnapshot);
    } catch (e) {}
}

module.exports = function startPeriodicScan(sock) {
    // يبدأ الفحص الهادئ بعد دقيقة من تشغيل البوت، ثم يتكرر كل 5 دقائق تماماً كما طلبت
    setTimeout(() => runScan(sock), 60 * 1000);
    setInterval(() => runScan(sock), 5 * 60 * 1000);
};

module.exports.runScan = runScan;
