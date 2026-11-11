const {
    jidNormalizedUser
} = require('@whiskeysockets/baileys');

module.exports = {
    command: 'تمشيط',
    description: 'فحص أعضاء المجموعة والبحث عن الحسابات التي لديها أجهزة إضافية.',
    category: 'ادارة',

    async execute(sock, msg) {

        const chatId = msg.key.remoteJid;

        // الأمر للمجموعات فقط
        if (!chatId || !chatId.endsWith('@g.us')) {
            return sock.sendMessage(
                chatId,
                {
                    text:
`*╮━━━❄︎〔 ❄️ 〕❄︎━━━╭*

*✧❄️❯ هذا الأمر يعمل داخل المجموعات فقط.*

*╯━━━❄︎〔 ❄️ 〕❄︎━━━╰*`
                },
                { quoted: msg }
            );
        }

        try {

            // ============================================
            // جلب أعضاء المجموعة مرة واحدة
            // ============================================

            const metadata = await sock.groupMetadata(chatId);

            const participants =
                Array.isArray(metadata.participants)
                    ? metadata.participants
                    : [];

            if (!participants.length) {
                return sock.sendMessage(
                    chatId,
                    {
                        text:
`*╮━━━❄︎〔 ❄️ 〕❄︎━━━╭*

*✧❄️❯ لم أجد أعضاء لفحصهم.*

*╯━━━❄︎〔 ❄️ 〕❄︎━━━╰*`
                    },
                    { quoted: msg }
                );
            }

            // ============================================
            // تجهيز الـ JIDs
            // ============================================

            const users = [];

            for (const participant of participants) {

                const jid =
                    participant.id ||
                    participant.jid;

                if (!jid) continue;

                try {

                    const normalized =
                        jidNormalizedUser(jid);

                    if (normalized && !users.includes(normalized)) {
                        users.push(normalized);
                    }

                } catch {
                    // تجاهل JID غير صالح
                }
            }

            // ============================================
            // بدء الفحص
            // ============================================

            await sock.sendMessage(
                chatId,
                {
                    text:
`*╮━━━❄︎〔 ❄️ 〕❄︎━━━╭*

*✧❄️❯ بدأ تمشيط المجموعة...*
*✧❄️❯ عدد الأعضاء: ${users.length}*

*✧═════•❁❄️❁•═════✧*

*✧❄️❯ جاري فحص الأجهزة المرتبطة...*

*╯━━━❄︎〔 ❄️ 〕❄︎━━━╰*`
                },
                { quoted: msg }
            );

            // ============================================
            // إعدادات الفحص
            // ============================================

            const BATCH_SIZE = 10;
            const DELAY = 1200;

            const suspicious = [];
            let checked = 0;

            // ============================================
            // الفحص على دفعات
            // ============================================

            for (
                let i = 0;
                i < users.length;
                i += BATCH_SIZE
            ) {

                const batch =
                    users.slice(i, i + BATCH_SIZE);

                try {

                    const devices =
                        await sock.getUSyncDevices(
                            batch,
                            false,
                            false
                        );

                    const deviceMap = new Map();

                    // تجهيز قائمة الأجهزة لكل مستخدم
                    for (const device of devices || []) {

                        if (
                            !device ||
                            typeof device.device !== 'number'
                        ) {
                            continue;
                        }

                        const user =
                            device.user;

                        if (!user) continue;

                        if (!deviceMap.has(user)) {
                            deviceMap.set(user, []);
                        }

                        deviceMap
                            .get(user)
                            .push(device.device);
                    }

                    // ========================================
                    // البحث عن الأجهزة الإضافية
                    // ========================================

                    for (const jid of batch) {

                        const username =
                            jid.split('@')[0];

                        const deviceNumbers =
                            deviceMap.get(username) || [];

                        const extraDevices =
                            deviceNumbers.filter(
                                device => device > 0
                            );

                        if (extraDevices.length > 0) {

                            suspicious.push({
                                jid,
                                username,
                                devices: extraDevices.length
                            });
                        }
                    }

                } catch (error) {

                    console.error(
                        '[تمشيط] فشل دفعة:',
                        error?.message || error
                    );
                }

                checked += batch.length;

                // ============================================
                // تأخير بين الدفعات
                // ============================================

                if (i + BATCH_SIZE < users.length) {
                    await new Promise(
                        resolve => setTimeout(resolve, DELAY)
                    );
                }
            }

            // ============================================
            // النتيجة
            // ============================================

            let resultText =
`*╮━━━❄︎〔 ❄️ 〕❄︎━━━╭*

*✧❄️❯ اكتمل تمشيط المجموعة.*
*✧❄️❯ تم فحص: ${checked} عضو*

*✧═════•❁❄️❁•═════✧*`;

            if (suspicious.length === 0) {

                resultText +=
`
*✧❄️❯ لم يظهر أي عضو لديه جهاز إضافي.*

*🛡️ الحالة: المجموعة نظيفة من ناحية الأجهزة الظاهرة للفحص.*

*╯━━━❄︎〔 ❄️ 〕❄︎━━━╰*`;

            } else {

                resultText +=
`
*🔗 الأجهزة الإضافية المكتشفة:* ${suspicious.length}

`;

                suspicious.forEach((user, index) => {

                    resultText +=
`*${index + 1}┆@${user.username}*
*✧❄️❯ أجهزة إضافية: ${user.devices}*

`;
                });

                resultText +=
`*✧═════•❁❄️❁•═════✧*

*⚠️ هؤلاء الحسابات ظهر لديهم جهاز إضافي.*
*⚠️ افحص الحساب يدويًا قبل اتخاذ أي إجراء.*

*╯━━━❄︎〔 ❄️ 〕❄︎━━━╰*`;
            }

            // ============================================
            // المنشنات
            // ============================================

            const mentions =
                suspicious.map(
                    user => user.jid
                );

            await sock.sendMessage(
                chatId,
                {
                    text: resultText,
                    mentions
                },
                { quoted: msg }
            );

        } catch (error) {

            console.error(
                '[تمشيط المجموعة]',
                error
            );

            await sock.sendMessage(
                chatId,
                {
                    text:
`*✧❄️❯ تعذر إكمال تمشيط المجموعة.*
*✧❄️❯ قد يكون السبب ضغطًا مؤقتًا من واتساب أو مشكلة في جلب بيانات المجموعة.*`
                },
                { quoted: msg }
            );
        }
    }
};