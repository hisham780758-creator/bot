const {
    getDateKey,
    getPreviousWeekDays,
    getGuildDayTotal,
    registerGuildGroup
} = require('../utils/interactionSystem');

const guilds = [
    { name: 'ريوجين', key: 'RYUJIN', symbol: '🐉' },
    { name: 'فينوم', key: 'VENOM', symbol: '🕷️' },
    { name: 'ماجيك', key: 'MAGIC', symbol: '🔮' },
    { name: 'توكسين', key: 'TOXEN', symbol: '🕯️' },
    { name: 'ڤاليريا', key: 'VALYRIA', symbol: '🌋' }
];

function findGuildGroup(groupList, guild) {
    return groupList.find(group => {
        const normalized = String(group.subject || '')
            .normalize('NFKC')
            .toUpperCase();

        if (
            normalized.includes('استقبال') ||
            normalized.includes('إستقبال') ||
            normalized.includes('اعلانات') ||
            normalized.includes('إعلانات') ||
            normalized.includes('اعلان') ||
            normalized.includes('إعلان') ||
            normalized.includes('ANNOUNCEMENT') ||
            normalized.includes('ANNOUNCEMENTS') ||
            normalized.includes('RECEPTION')
        ) {
            return false;
        }

        const isCamora =
            normalized.includes('C•M•A') ||
            normalized.includes('C.M.A') ||
            normalized.includes('CMA');

        const hasGuild =
            normalized.includes(guild.key) ||
            normalized.includes(guild.name.toUpperCase());

        return isCamora && hasGuild;
    });
}

async function processGuildCalculation(sock, msg, period = 'اليوم') {
    try {
        const chatId = msg.key.remoteJid;

        // التحقق من أن الأمر يتم تنفيذه داخل مجموعة فقط
        if (!chatId || !chatId.endsWith('@g.us')) {
            return await sock.sendMessage(
                chatId,
                { text: '❌ هذا الأمر للقروبات فقط.' },
                { quoted: msg }
            );
        }

        let periodType = 'today';
        period = period.toLowerCase();

        if (period === 'اليوم' || period === '') {
            periodType = 'today';
        } else if (period === 'امس' || period === 'أمس') {
            periodType = 'yesterday';
        } else if (
            period === 'اسبوع' ||
            period === 'أسبوع' ||
            period === 'الاسبوع' ||
            period === 'الأسبوع'
        ) {
            periodType = 'previousWeek';
        } else {
            return await sock.sendMessage(
                chatId,
                {
                    text:
`❌ الحسبة غير معروفة.

✧❄️❯ الاستخدام:
*حسبة اليوم*
*حسبة امس*
*حسبة اسبوع*`
                },
                { quoted: msg }
            );
        }

        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);
        const results = [];

        for (const guild of guilds) {
            const group = findGuildGroup(groupList, guild);

            if (group) {
                registerGuildGroup(group.id, guild.key);
            }

            let count = 0;

            if (periodType === 'today') {
                count = getGuildDayTotal(guild.key, getDateKey());
            } else if (periodType === 'yesterday') {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                count = getGuildDayTotal(guild.key, getDateKey(yesterday));
            } else {
                count = 0;
                const days = getPreviousWeekDays();
                for (const date of days) {
                    count += getGuildDayTotal(guild.key, date);
                }
            }

            results.push({ ...guild, count });
        }

        let periodTitle = 'اليوم';
        if (periodType === 'yesterday') periodTitle = 'أمس';
        else if (periodType === 'previousWeek') periodTitle = 'الأسبوع الماضي';

        let text =
`✧═════•❁❄️❁•═════✧
*✧❄️❯ءٰٖ 𝐅•𝐑•𝐓 ❄️ 𝐅𝐎𝐑𝐄𝐒𝐓*
✧═════•❁❄️❁•═════✧
*┇حســبــــات 📊 التفـــــاعـــل┇↡*
*📅 ${periodTitle}*

✧═════•❁❄️❁•═════✧\n\n`;

        results.forEach(guild => {
            text +=
`*┇◑ النقــابة 『 ${guild.name} 』*
*┇◑ الشعــار 『 ${guild.symbol} 』*
*┇◑ التفــاعل📊『 ${guild.count} 』*

✧═════•❁❄️❁•═════✧\n\n`;
        });

        text += `*✍︎┇المســؤول┇↵ 「ســـو🪶نـــغ」*`;

        await sock.sendMessage(chatId, { text }, { quoted: msg });
    } catch (error) {
        console.error('❌ خطأ في حسبة النقابات:', error);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: `❌ حدث خطأ أثناء حساب تفاعل النقابات.\n\n📌 ${error.message || error}` },
            { quoted: msg }
        );
    }
}

module.exports = {
    guilds,
    findGuildGroup,
    processGuildCalculation
};
