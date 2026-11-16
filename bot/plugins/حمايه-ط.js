const fs = require('fs');
const path = require('path');
const { jidDecode } = require('@whiskeysockets/baileys');
const { eliteNumbers: ALLOWED_ADMINS } = require(path.join(process.cwd(), 'haykala', 'elite.js'));

const dataDir = path.join(__dirname, '..', 'data');
const monitorFile = path.join(dataDir, 'monitorState.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(monitorFile)) fs.writeFileSync(monitorFile, JSON.stringify({}));

const loadMonitorState = () => {
    try {
        return JSON.parse(fs.readFileSync(monitorFile));
    } catch (err) {
        console.error("خطأ في قراءة ملف المراقبة:", err);
        return {};
    }
};

const saveMonitorState = (data) => {
    try {
        fs.writeFileSync(monitorFile, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("خطأ في حفظ ملف المراقبة:", err);
    }
};

let handlerAttached = false;
const cooldowns = {};

module.exports = {
    command: 'حمايه',
    description: 'يسحب الإشراف من غير النخبة ويعيد ترقية النخبة تلقائياً عند أي تغيير.',
usage: '.حمايه-ط',
    category: 'zarf',
    async execute(sock, m) {
        const groupId = m.key.remoteJid;
        const sender = m.key.participant || m.participant;

        if (!groupId.endsWith('@g.us')) {
            return sock.sendMessage(groupId, { text: '❌ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: m });
        }

        const senderNumber = (sender || '').split('@')[0];
        if (!ALLOWED_ADMINS.includes(senderNumber)) {
            return sock.sendMessage(groupId, { text: '⚠️ هذا الأمر مخصص فقط للنخبة.' }, { quoted: m });
        }

        const state = loadMonitorState();

        if (state[groupId]) {
            delete state[groupId];
            saveMonitorState(state);
            return sock.sendMessage(groupId, { text: '❎ تم إلغاء المراقبة عن هذه المجموعة.' }, { quoted: m });
        }

        state[groupId] = true;
        saveMonitorState(state);
        sock.sendMessage(groupId, { text: '⭐ نـورتـم الـجـروب.' }, { quoted: m });

        if (handlerAttached) return;

        sock.ev.on('group-participants.update', async (update) => {
            const state = loadMonitorState();
            const groupId = update.id;

            if (!state[groupId]) return;
            if (cooldowns[groupId]) return;

            cooldowns[groupId] = true;
            setTimeout(() => delete cooldowns[groupId], 0);

            try {
                const metadata = await sock.groupMetadata(groupId);
                const botId = jidDecode(sock.user.id).user + '@s.whatsapp.net';
                const participants = metadata.participants;

                const toDemote = [];
                const toPromote = [];

                for (const p of participants) {
                    const num = p.id.split('@')[0];
                    const isAllowed = ALLOWED_ADMINS.includes(num);

                    if (p.admin && !isAllowed && p.id !== botId && p.id !== metadata.owner) {
                        toDemote.push(p.id);
                    }

                    if (!p.admin && isAllowed) {
                        toPromote.push(p.id);
                    }
                }

                if (toDemote.length === 0 && toPromote.length === 0) return;

                await sock.sendMessage(groupId, {
                    text: '🚨 تم رصد تعديل في الإشراف.\n⬇️ سيتم الآن سحب الإشراف من غير النخبة و⬆️ ترقية النخبة إن وُجدوا.'
                });

                if (toDemote.length > 0) {
                    for (let i = 0; i < toDemote.length; i += 1025) {
                        const chunk = toDemote.slice(i, i + 1025);
                        await sock.groupParticipantsUpdate(groupId, chunk, 'demote').catch(console.error);
                        if (i + 1025 < toDemote.length) await new Promise(res => setTimeout(res, 10));
                    }
                }

                if (toPromote.length > 0) {
                    for (let i = 0; i < toPromote.length; i += 1025) {
                        const chunk = toPromote.slice(i, i + 1025);
                        await sock.groupParticipantsUpdate(groupId, chunk, 'promote').catch(console.error);
                        if (i + 1025 < toPromote.length) await new Promise(res => setTimeout(res, 10));
                    }
                }

                await sock.sendMessage(groupId, {
                    text: `✅ تم سحب الإشراف من ${toDemote.length} عضو${toDemote.length === 1 ? '' : 'اً'} وتم ترقية ${toPromote.length} من النخبة.`
                });

            } catch (err) {
                console.error("خطأ أثناء تنفيذ الحماية:", err);
            }
        });

        handlerAttached = true;
    }
};