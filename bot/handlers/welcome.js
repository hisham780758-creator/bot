const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(r => setTimeout(r, ms));
const statusPath = path.join(__dirname, '../data/join_status.json');
const alertConfigPath = path.join(__dirname, '../data/alert_group.json');

// جلب معرف مجموعة الإشعارات تلقائياً
function getAlertGroup() {
    try {
        if (fs.existsSync(alertConfigPath)) {
            const data = JSON.parse(fs.readFileSync(alertConfigPath, 'utf8'));
            if (data && data.alertGroup) return data.alertGroup;
        }
    } catch (e) {}
    return '120363431048497309@g.us'; // قيمة افتراضية احتياطية
}

function isMonitoringEnabled() {
    try {
        if (fs.existsSync(statusPath)) {
            const data = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            return data.enabled !== false;
        }
    } catch {}
    return true;
}

module.exports = async function welcome(sock, update) {
    try {
        if (!isMonitoringEnabled()) return;

        const { id: groupId, participants, action } = update;

        if (action !== 'add') return;
        if (!participants || participants.length === 0) return;

        let groupName = groupId;
        try {
            const meta = await sock.groupMetadata(groupId);
            groupName = meta.subject || groupId;
        } catch {}

        await delay(3000);

        for (const participant of participants) {
            const normalized = jidNormalizedUser(participant);
            const username   = normalized.split('@')[0];

            let devicesCount = 0;
            let deviceLine   = '✅ لا أجهزة إضافية';

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
                const extraDevices  = [...new Set(deviceNumbers.filter(device => device > 0))];
                devicesCount = extraDevices.length;

                if (devicesCount > 0) {
                    deviceLine = `⚠️ مرتبط بـ ${devicesCount} جهاز إضافي`;
                }
            } catch (e) {
                deviceLine = '❓ تعذر الفحص';
            }

            const date = new Date().toLocaleString('en-GB', {
                timeZone: 'Africa/Cairo',
                hour12: false
            });

            const report =
`*⎔⋅• ━ ╼╃ ⌬〔 🪶 〕⌬ ╄╾ ━ •⋅*

*⌗˖￤اسـم الـجـروب⬿『 ${groupName} 』*
*⌗˖￤الـحـالـة⬿『 عـضو جديد ⚠️ 』*

*👤 「 @${username} 」⤹*
انضم إلى المجموعة للتو.

🔌 *نتيجة فحص الأجهزة:*
${deviceLine} (${devicesCount})

*⎔⋅• ━ ╼╃ ⌬〔 🪶 〕⌬ ╄╾ ━ •⋅*
*🕒 ${date}*`;

            // 💡 توجيه تقرير الترحيب إلى مجموعة الإشعارات لتجنب التشفير المعلق نهائياً
            const targetJid = getAlertGroup();
            
            await sock.sendMessage(targetJid, {
                text: report,
                mentions: [normalized]
            });

            await delay(1000);
        }

    } catch (e) {
        console.log('❌ خطأ في welcome:', e.message);
    }
};
