/**
 * تبنيد-ك.js — أمر التحكم في تفعيل وإيقاف نظام الحماية ورصد المجموعات
 */
const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '../group_security_settings.json');

function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
    } catch (error) {
        console.error('[حماية المجموعات] خطأ في قراءة ملف الإعدادات:', error);
    }
    return {};
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('[حماية المجموعات] خطأ في حفظ ملف الإعدادات:', error);
    }
}

module.exports = {
    name: 'تبنيد-ك',
    command: ['تبنيد-ك'],
    category: 'owner',
    description: 'نظام حماية ورصد المجموعات والمنشن ورصد البلاغات الخارجية وتيليجرام',

    async execute(sock, m) {
        const jid = m.key.remoteJid;
        const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        const args = body.trim().split(/ +/).slice(1);
        const sub = args[0]?.trim()?.toLowerCase();
        const action = args[1]?.trim()?.toLowerCase();

        let groupSettings = loadSettings();

        const reply = async (text) => {
            return await sock.sendMessage(jid, { text }, { quoted: m });
        };

        try {
            let groups = [];
            if (typeof sock.groupFetchAllParticipating === 'function') {
                const groupMetadatas = await sock.groupFetchAllParticipating();
                groups = Object.values(groupMetadatas);
            }

            // 1. معالجة أمر "تفعيل الكل" أو "إيقاف الكل"
            if (sub === 'تفعيل' && action === 'الكل') {
                for (const g of groups) {
                    if (!groupSettings[g.id]) groupSettings[g.id] = {};
                    groupSettings[g.id].enabled = true;
                }
                saveSettings(groupSettings);
                return reply('🛡️ *[بروتوكول الحماية الشامل]*\n✅ تم تفعيل حماية ورصد جميع المجموعات بنجاح.');
            }

            if (sub === 'إيقاف' && action === 'الكل') {
                for (const g of groups) {
                    if (!groupSettings[g.id]) groupSettings[g.id] = {};
                    groupSettings[g.id].enabled = false;
                }
                saveSettings(groupSettings);
                return reply('⚠️ *[بروتوكول الحماية الشامل]*\n❌ تم إيقاف حماية جميع المجموعات.');
            }

            // 2. عرض القائمة إذا لم يتم تحديد هدف
            if (!sub) {
                if (!groups || groups.length === 0) {
                    return reply('⚠️ [النظام] لم يتم العثور على أي جروبات نشطة.');
                }

                let textMsg = '🛡️ *إدارة حماية المجموعات (تبنيد-ك):*\n';
                groups.forEach((g, i) => {
                    const status = groupSettings[g.id]?.enabled ? 'مفعل ✅' : 'متوقف ❌';
                    textMsg += `\n┌ 🎯 *الهدف [${i + 1}]* :${g.subject || 'غير معروف'}\n├ 📊 الحالة : ${status}\n└ 👥 الأعضاء : ${g.participants?.length || 0}`;
                });
                textMsg += '\n\n💻 *طريقة التنفيذ:* \`.تبنيد-ك <رقم_الهدف> <تفعيل/إيقاف>\`\n🌐 *أو للتفعيل العام:* \`.تبنيد-ك تفعيل الكل\`';
                return reply(textMsg);
            }

            const groupIndex = parseInt(sub) - 1;
            if (isNaN(groupIndex) || groupIndex < 0 || groupIndex >= groups.length) {
                return reply('❌ [خطأ] رقم الهدف غير صحيح. استخدم الأمر `.تبنيد-ك` لعرض قائمة الجروبات أو `.تبنيد-ك تفعيل الكل`.');
            }

            const targetGroup = groups[groupIndex];
            const targetJid = targetGroup.id;

            if (!groupSettings[targetJid]) {
                groupSettings[targetJid] = { enabled: false };
            }

            if (action === 'تفعيل' || action === 'on') {
                groupSettings[targetJid].enabled = true;
                saveSettings(groupSettings);
                return reply(
                    `🛡️ [بروتوكول الحماية النشط]\n` +
                    `🚀 المجموعة: *${targetGroup.subject}*\n` +
                    `🔥 الحالة: *تم تفعيل نظام الحماية ورصد الطلبات والبلاغات بنجاح*`
                );
            } 
            else if (action === 'إيقاف' || action === 'off') {
                groupSettings[targetJid].enabled = false;
                saveSettings(groupSettings);
                return reply(
                    `⚠️ [بروتوكول الحماية المتوقف]\n` +
                    `🚀 المجموعة: *${targetGroup.subject}*\n` +
                    `❌ الحالة: *تم إيقاف نظام الحماية*`
                );
            } 
            else {
                const currentStatus = groupSettings[targetJid].enabled ? 'مفعل ✅' : 'متوقف ❌';
                return reply(
                    `📊 *حالة المجموعة المستهدفة:* ${targetGroup.subject}\n` +
                    `• الحالة الحالية للحماية: ${currentStatus}\n\n` +
                    `💻 *طريقة التعديل:* \`.تبنيد-ك ${sub} تفعيل\` أو \`.تبنيد-ك ${sub} إيقاف\``
                );
            }

        } catch (e) {
            return reply(`❌ [خطأ حرج]: ${e.message}`);
        }
    }
};
