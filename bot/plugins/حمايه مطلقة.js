const fs = require('fs');
const path = require('path');
const { jidDecode } = require('@whiskeysockets/baileys');

const dataDir = path.join(__dirname, '..', 'data');
const monitorFile = path.join(dataDir, 'monitorState.json');
const eliteFile = path.join(dataDir, 'elite.json'); // ملف النخبة

// إنشاء المجلدات والملفات إذا لم تكن موجودة
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(monitorFile)) fs.writeFileSync(monitorFile, JSON.stringify({}));
if (!fs.existsSync(eliteFile)) fs.writeFileSync(eliteFile, JSON.stringify(['128931867880'], null, 2)); // رقمك كنخبة افتراضي

// تحميل حالة الحماية
const loadMonitorState = () => {
    try {
        return JSON.parse(fs.readFileSync(monitorFile));
    } catch {
        return {};
    }
};

// حفظ حالة الحماية
const saveMonitorState = (data) => {
    try {
        fs.writeFileSync(monitorFile, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("❌ خطأ حفظ حالة المراقبة:", err);
    }
};

// تحميل قائمة النخبة
const loadEliteList = () => {
    try {
        return JSON.parse(fs.readFileSync(eliteFile));
    } catch {
        return [];
    }
};

let handlerAttached = false;
const cooldowns = {};

module.exports = {
    command: 'ط',
    description: '🔒 تفعيل أو إيقاف الحماية المطلقة.',
usage: '.حمايه مطلقة',
    category: 'zarf',
    async execute(sock, m) {
        const groupId = m.key.remoteJid;
        const sender = m.key.participant || m.participant;

        if (!groupId.endsWith('@g.us')) {
            return sock.sendMessage(groupId, { text: '❌ هذا الأمر يعمل فقط في المجموعات.' }, { quoted: m });
        }

        const senderNumber = (sender || '').split('@')[0];
        const allowedAdmins = loadEliteList(); // قراءة قائمة النخبة من الملف
        if (!allowedAdmins.includes(senderNumber)) {
            return sock.sendMessage(groupId, { text: '⚠️ فقط النخبة يمكنهم التحكم بالحماية.' }, { quoted: m });
        }

        const state = loadMonitorState();

        if (state[groupId]) {
            delete state[groupId];
            saveMonitorState(state);
            return sock.sendMessage(groupId, { text: '🔓 تم إيقاف الحماية المطلقة.' }, { quoted: m });
        }

        state[groupId] = true;
        saveMonitorState(state);
        sock.sendMessage(groupId, { text: '🚨 تم تفعيل الحماية المطلقة..' }, { quoted: m });

        if (handlerAttached) return;

        sock.ev.on('group-participants.update', async (update) => {
            const state = loadMonitorState();
            const groupId = update.id;

            if (!state[groupId]) return;
            if (cooldowns[groupId]) return;

            cooldowns[groupId] = true;
            setTimeout(() => delete cooldowns[groupId], 2000);

            try {
                const metadata = await sock.groupMetadata(groupId);
                const botId = jidDecode(sock.user.id).user + '@s.whatsapp.net';
                const participants = metadata.participants;

                const fixedAdmins = loadEliteList(); // المشرفين الثابتين هم نفس النخبة
                const allowedJids = [
                    botId,
                    ...fixedAdmins.map(num => num + '@s.whatsapp.net')
                ];

                const actor = update.actor || null;

                // المشرفين الحاليين باستثناء البوت والنخبة
                const toDemote = participants
                    .filter(p => p.admin && !allowedJids.includes(p.id) && p.id !== metadata.owner)
                    .map(p => p.id);

                // تأكد أن النخبة مشرفين
                const toPromote = allowedJids
                    .filter(jid => {
                        const p = participants.find(p => p.id === jid);
                        return p && !p.admin;
                    });

                if (toDemote.length > 0 || toPromote.length > 0) {
                    const mentions = [];

                    if (actor) mentions.push(actor);
                    mentions.push(...toDemote);

                    if (toDemote.length > 0) {
                        await sock.groupParticipantsUpdate(groupId, toDemote, 'demote').catch(console.error);
                    }

                    if (toPromote.length > 0) {
                        await sock.groupParticipantsUpdate(groupId, toPromote, 'promote').catch(console.error);
                    }

                    const text = `🚨 *الحماية المطلقة مفعّلة!*\n\n` +
                        `👤 *تم منح إشراف بواسطة:* @${(actor || '').split('@')[0]}\n\n` +
                        (toDemote.length > 0 ? `❌ *تم سحب الإشراف من:*\n${toDemote.map(j => `• @${j.split('@')[0]}`).join('\n')}\n\n` : ``) +
                        `🔁 *تم إرجاع الحالة الأصلية.*`;

                    await sock.sendMessage(groupId, {
                        text,
                        mentions
                    });
                }

            } catch (err) {
                console.error("خطأ أثناء الحماية:", err);
            }
        });

        handlerAttached = true;
    }
};