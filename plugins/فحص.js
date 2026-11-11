const {
    jidNormalizedUser
} = require('@whiskeysockets/baileys');

module.exports = {
    command: 'فحص',
    description: 'فحص الأجهزة المرتبطة بحساب العضو.',
    category: 'عام',

    async execute(sock, msg) {

        const chatId = msg.key.remoteJid;
        const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            '';

        const context =
            msg.message?.extendedTextMessage?.contextInfo;

        // =========================================================
        // استخراج الرقم من أي صيغة
        // =========================================================

        function normalizeNumber(value) {

            if (!value) return null;

            let number = String(value)
                .replace(/[^\d]/g, '');

            if (!number) return null;

            return number;
        }

        // =========================================================
        // استخراج المنشن
        // =========================================================

        const mentionedJids =
            context?.mentionedJid || [];

        // =========================================================
        // استخراج المستهدف من الرد
        // =========================================================

        const quotedParticipant =
            context?.participant ||
            context?.participantAlt ||
            null;

        // =========================================================
        // استخراج الرقم المكتوب بعد الأمر
        // =========================================================

        const args = text.trim().split(/\s+/).slice(1);

        let targetJid = null;

        // =========================================================
        // 1 — المنشن
        // =========================================================

        if (mentionedJids.length > 0) {

            targetJid =
                jidNormalizedUser(
                    mentionedJids[0]
                );
        }

        // =========================================================
        // 2 — الرقم
        // =========================================================

        else if (args.length > 0) {

            const number =
                normalizeNumber(args[0]);

            if (number) {

                targetJid =
                    jidNormalizedUser(
                        `${number}@s.whatsapp.net`
                    );
            }
        }

        // =========================================================
        // 3 — الرد على شخص
        // =========================================================

        else if (quotedParticipant) {

            targetJid =
                jidNormalizedUser(
                    quotedParticipant
                );
        }

        // =========================================================
        // لا يوجد مستهدف
        // =========================================================

        else {

            return sock.sendMessage(
                chatId,
                {
                    text:
                        `*⚡ طريقة الاستخدام:*\n\n` +
                        `*✧❄️❯ .فحص @منشن*\n` +
                        `*✧❄️❯ .فحص 967xxxxxxxxx*\n` +
                        `*✧❄️❯ رد على رسالة ثم اكتب .فحص*`
                },
                { quoted: msg }
            );
        }

        // =========================================================
        // التأكد من صحة الـ JID
        // =========================================================

        if (!targetJid) {

            return sock.sendMessage(
                chatId,
                {
                    text:
                        '❌ لم أستطع تحديد العضو المستهدف.'
                },
                { quoted: msg }
            );
        }

        try {

            // =====================================================
            // التأكد من توفر getUSyncDevices
            // =====================================================

            if (
                typeof sock.getUSyncDevices !== 'function'
            ) {

                return sock.sendMessage(
                    chatId,
                    {
                        text:
                            '⚠️ إصدار Baileys الموجود عندك لا يدعم فحص الأجهزة بهذه الطريقة.'
                    },
                    { quoted: msg }
                );
            }

            // =====================================================
            // فحص الحساب
            // =====================================================

            const devices =
                await sock.getUSyncDevices(
                    [targetJid],
                    false,
                    false
                );

            const deviceList =
                Array.isArray(devices)
                    ? devices
                    : [];

            // =====================================================
            // الأجهزة الإضافية
            // =====================================================

            const companionDevices =
                deviceList.filter(
                    device =>
                        typeof device?.device === 'number' &&
                        device.device > 0
                );

            // =====================================================
            // الجهاز الأساسي
            // =====================================================

            const primaryDevice =
                deviceList.some(
                    device =>
                        typeof device?.device === 'number' &&
                        device.device === 0
                );

            // =====================================================
            // الرقم
            // =====================================================

            const username =
                targetJid
                    .split('@')[0]
                    .split(':')[0];

            // =====================================================
            // الحالة
            // =====================================================

            let status;

            if (companionDevices.length > 0) {

                status =
                    `⚠️ يوجد ${companionDevices.length} جهاز/جلسة إضافية`;

            } else {

                status =
                    '✅ لم يظهر جهاز إضافي';
            }

            // =====================================================
            // إرسال النتيجة
            // =====================================================

            await sock.sendMessage(
                chatId,
                {
                    text: `
*╮━━━━❄︎〔 ❄️ 〕❄︎━━━━╭*
*👤العضو :* @${username}
*📱 الجهاز الأساسي: ${primaryDevice ? 'موجود' : 'غير ظاهر'}*
*🔗 الأجهزة الإضافية: ${companionDevices.length}*
*✧═════•❁❄️❁•═════✧*
*🛡️ الحالة:*
*${status}*
*╯━━━━❄︎〔 ❄️ 〕❄︎━━━━╰*
`,
                    mentions: [targetJid]
                },
                { quoted: msg }
            );

        } catch (error) {

            console.error(
                '[فحص الأجهزة]',
                error
            );

            await sock.sendMessage(
                chatId,
                {
                    text:
                        '❌ تعذر فحص أجهزة هذا الحساب.'
                },
                { quoted: msg }
            );
        }
    }
};