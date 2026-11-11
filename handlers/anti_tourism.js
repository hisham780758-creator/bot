const fs = require('fs');
const path = require('path');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');

const alertConfigPath = path.join(__dirname, '../data/alert_group.json');
const tourismGroupsPath = path.join(__dirname, '../data/tourism_registered_groups.json');

let registeredGroupsCache = new Set();

function loadRegisteredGroups() {
    try {
        if (fs.existsSync(tourismGroupsPath)) {
            const data = JSON.parse(fs.readFileSync(tourismGroupsPath, 'utf8'));
            if (Array.isArray(data)) {
                registeredGroupsCache = new Set(data);
                console.log(`✈️ [رادار السياحة] تم تحميل ${registeredGroupsCache.size} جروب مسجل.`);
                return;
            }
        }
    } catch (e) {
        console.error('❌ خطأ في قراءة ملف الجروبات المسجلة للسياحة:', e);
    }
    registeredGroupsCache = new Set();
}

loadRegisteredGroups();

function reloadCache() {
    loadRegisteredGroups();
}

function getAlertGroup() {
    try {
        if (fs.existsSync(alertConfigPath)) {
            const data = JSON.parse(fs.readFileSync(alertConfigPath, 'utf8'));
            if (data && data.alertGroup) return data.alertGroup;
        }
    } catch (e) {}
    return '120363431048497309@g.us';
}

const joinTracker = new Map();
const TIME_WINDOW_MS = 3 * 60 * 1000; // 3 دقائق

module.exports = {
    reloadCache,
    initAntiTourism(sock) {
        sock.ev.on('group-participants.update', async (event) => {
            try {
                if (!event || event.action !== 'add' || !event.participants) return;
                const groupId = event.id;
                
                if (!registeredGroupsCache.has(groupId)) return;

                let groupName = groupId;
                try {
                    const meta = await sock.groupMetadata(groupId);
                    groupName = meta.subject || groupId;
                } catch (e) {}

                const now = Date.now();

                for (const rawParticipant of event.participants) {
                    // تطبيع المعرف واستبعاد معرفات الـ LID الوهمية لضمان الحصول على رقم الهاتف الحقيقي
                    const normJid = jidNormalizedUser(rawParticipant);
                    if (!normJid || normJid.includes('@lid') || !normJid.endsWith('@s.whatsapp.net')) continue;

                    const cleanNumber = normJid.split('@')[0].replace(/[^0-9]/g, '');
                    if (!cleanNumber || cleanNumber.length < 7) continue;

                    if (!joinTracker.has(cleanNumber)) {
                        joinTracker.set(cleanNumber, []);
                    }

                    let history = joinTracker.get(cleanNumber);
                    history = history.filter(item => now - item.time <= TIME_WINDOW_MS);

                    const alreadyExists = history.some(item => item.groupId === groupId);
                    if (!alreadyExists) {
                        history.push({ groupId, groupName, time: now });
                    }

                    joinTracker.set(cleanNumber, history);

                    if (history.length >= 2) {
                        const uniqueGroups = [...new Set(history.map(h => h.groupName))];
                        
                        if (uniqueGroups.length >= 2) {
                            const date = new Date().toLocaleString('en-GB', {
                                timeZone: 'Africa/Cairo',
                                hour12: false
                            });

                            const alertGroup = getAlertGroup();
                            const targetJid = `${cleanNumber}@s.whatsapp.net`;
                            const groupsListStr = uniqueGroups.join(' ، ');

                            const alertMsg = 
`*⎔⋅• ━ ╼╃ ⌬〔 🪶 〕⌬ ╄╾ ━ •⋅*

*⌗˖￤اسـم الـجـروب⬿『 ${groupName} 』*
*⌗˖￤الـحـالـة⬿『 بلاغ رصد سياحة / تنقل بين الجروبات المسجلة 🚨 』*

*👤 「 @${cleanNumber} 」⤹*
*⌗˖￤التصنيف⬿『 تنقل بين ${uniqueGroups.length} مجموعات مسجلة 』*
*⌗˖￤المجموعات المرصودة⬿『 ${groupsListStr} 』*

*⎔⋅• ━ ╼╃ ⌬〔 🪶 〕⌬ ╄╾ ━ •⋅*
*🕒 ${date}*`;

                            await sock.sendMessage(alertGroup, {
                                text: alertMsg,
                                mentions: [targetJid]
                            });
                            console.log(`✈️ [رادار السياحة] تم رصد وتبليغ تنقل العضو برقم حقيقي: ${cleanNumber}`);

                            joinTracker.delete(cleanNumber);
                        }
                    }
                }
            } catch (err) {
                console.error('❌ خطأ في معالجة رادار السياحة:', err);
            }
        });

        console.log('✈️ [رادار السياحة anti_tourism] يعمل بستايل 🪶 بنجاح مع الفلترة الصحيحة.');
    }
};
