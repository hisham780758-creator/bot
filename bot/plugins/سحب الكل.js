const { eliteNumbers } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'سحب',
    description: 'إزالة الإشراف عن جميع المشرفين في المجموعة ما عدا النخبة.',
    usage: '.سحب',
    category: '𝐄𝐑𝐄𝐍',

    async execute(sock, msg) {
        try {
            const groupJid = msg.key.remoteJid;
            const sender = decode(msg.key.participant || groupJid);
            const senderLid = sender.split('@')[0];

            if (!groupJid.endsWith('@g.us')) return;

            if (!eliteNumbers.includes(senderLid)) return;

            const groupMetadata = await sock.groupMetadata(groupJid);
            const owner = groupMetadata.owner;
            const admins = groupMetadata.participants.filter(
                m => m.admin === 'admin' || m.admin === 'superadmin'
            );

            if (admins.length === 0) {
                return await sock.sendMessage(groupJid, {
                    text: '❗ لا يوجد مشرفون في هذه المجموعة.',
                }, { quoted: msg });
            }

            const demoteList = admins
                .map(a => a.id)
                .filter(id => id !== owner && !eliteNumbers.includes(decode(id).split('@')[0]));

            if (demoteList.length === 0) {
                return await sock.sendMessage(groupJid, {
                    text: '🚫 لا يمكن إزالة إشراف مالك المجموعة أو أعضاء النخبة.',
                }, { quoted: msg });
            }

            await sock.groupParticipantsUpdate(groupJid, demoteList, 'demote');

            await sock.sendMessage(groupJid, {
                text: '✅ تم إزالة الإشراف عن جميع المشرفين ما عدا النخبة بنجاح.',
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ خطأ في أمر السحب:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '⚠️ حدث خطأ أثناء تنفيذ العملية.',
            }, { quoted: msg });
        }
    }
};