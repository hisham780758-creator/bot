const fs = require('fs');
const path = require('path');
const { isElite } = require('../haykala/elite');

const contactsFile =
    path.join(__dirname, '../data/جهات.json');


// =====================================================
// قراءة المجموعات المفعّل فيها الحذف
// =====================================================

function getEnabledChats() {

    if (!fs.existsSync(contactsFile)) {

        fs.writeFileSync(
            contactsFile,
            JSON.stringify([], null, 2)
        );

    }

    try {

        const data =
            fs.readFileSync(
                contactsFile,
                'utf8'
            );

        const parsed = JSON.parse(data);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch {

        return [];

    }

}


// =====================================================
// حفظ المجموعات
// =====================================================

function saveEnabledChats(chats) {

    fs.writeFileSync(
        contactsFile,
        JSON.stringify(chats, null, 2)
    );

}


// =====================================================
// إضافة / إزالة مجموعة
// =====================================================

function toggleChat(chatId) {

    const chats =
        getEnabledChats();

    const index =
        chats.indexOf(chatId);

    if (index === -1) {

        chats.push(chatId);

        saveEnabledChats(chats);

        return true;

    }

    chats.splice(index, 1);

    saveEnabledChats(chats);

    return false;

}


// =====================================================
// الأمر
// =====================================================

module.exports = {

    command: 'جهات-ح',

    category: 'ادوات',

    description:
        'تفعيل أو تعطيل حذف جهات الاتصال تلقائيًا',

    async execute(sock, msg) {

        try {

            const chatId =
                msg?.key?.remoteJid;

            if (!chatId?.endsWith('@g.us')) {

                return sock.sendMessage(
                    chatId,
                    {
                        text:
                            '🚫 هذا الأمر يعمل داخل المجموعات فقط.'
                    },
                    { quoted: msg }
                );

            }


            // =================================================
            // النخبة فقط
            // =================================================

            const senderJid =
                msg.key.participant ||
                msg.participant ||
                '';

            const senderNumber =
                senderJid.split('@')[0];

            if (!isElite(senderNumber)) {

                return;

            }


            // =================================================
            // تشغيل / إيقاف
            // =================================================

            const enabled =
                toggleChat(chatId);


            await sock.sendMessage(
                chatId,
                {
                    text: enabled
                        ? '❄️ تم تفعيل حذف جهات الاتصال.'
                        : '🧊 تم تعطيل حذف جهات الاتصال.'
                },
                { quoted: msg }
            );

        } catch (err) {

            console.log(
                '❌ خطأ في أمر حذف_الجهات:',
                err
            );

        }

    }

};