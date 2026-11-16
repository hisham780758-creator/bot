// ═══════════════════════════════════════════════════
// plugins/دخول.js — أمر لتفعيل أو إيقاف مراقبة الدخول عاماً
// ═══════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const statusPath = path.join(__dirname, '../data/join_status.json');

function getStatus() {
    try {
        if (fs.existsSync(statusPath)) {
            const data = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            return data.enabled !== false;
        }
    } catch {}
    return true; // الافتراضي مفعل
}

function setStatus(status) {
    try {
        const dir = path.dirname(statusPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(statusPath, JSON.stringify({ enabled: status }, null, 2));
    } catch (e) {}
}

module.exports = {
    command: 'دخول',
    description: 'تفعيل أو إيقاف مراقبة انضمام الأعضاء الجدد في جميع المجموعات',
    usage: '.دخول',
    category: 'tools',

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const currentState = getStatus();
        const newState = !currentState;
        setStatus(newState);

        const stateText = newState 
            ? '✅ **تم تفعيل مراقبة الدخول لجميع المجموعات بنجاح.**' 
            : '🛑 **تم إيقاف مراقبة الدخول لجميع المجموعات.**';

        await sock.sendMessage(jid, {
            text: stateText
        }, { quoted: msg });
    }
};
