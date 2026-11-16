📄 *منع-منشن.js* (جزء 1/2):

const fs = require('fs');
const path = require('path');
const { isElite } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

const warnings = {};
const activeGroups = new Set();
let isListenerActive = false;

const dataDir = path.join(__dirname, '..', 'data');
// تم تحديث اسم الملف هنا
const filePath = path.join(dataDir, 'man2.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}), 'utf8');

module.exports = {
  command: 'منع',
  description: 'يمنع المنشن المخفي في المجموعة (بإذن النخبة) ويقوم بتفعيله وإلغاء تفعيله.',
usage: '.منع_منشن',
category: 'tools',

  async execute(sock, msg) {
    try {
      const groupJid = msg.key.remoteJid;
      const sender = decode(msg.key.participant || groupJid);
      const senderLid = sender.split('@')[0];

      if (!groupJid.endsWith('@g.us')) {
        return await sock.sendMessage(groupJid, {
          text: '❗ هذا الأمر يعمل فقط داخل المجموعات.'
        }, { quoted: msg });
      }

      if (!isElite(senderLid)) {
        return await sock.sendMessage(groupJid, {
          text: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.'
        }, { quoted: msg });
      }

      // Toggle the state of the command for the group
      if (activeGroups.has(groupJid)) {
        activeGroups.delete(groupJid);
        await sock.sendMessage(groupJid, {
          text: "⛔ تم إلغاء تفعيل منع المنشن المخفي في هذه المجموعة."
        }, { quoted: msg });
      } else {
        activeGroups.add(groupJid);
        await sock.sendMessage(groupJid, {
          text: '✅ تم تفعيل منع المنشن المخفي. سيتم طرد المزعجين بعد 3 تحذيرات.'
        }, { quoted: msg });

        // Activate the listener only once
        if (!isListenerActive) {
          isListenerActive = true;
          sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
              if (!msg.message || msg.key.fromMe) continue;

              const currentChat = msg.key.remoteJid;
              const participant = msg.key.participant || currentChat;
              const sender = participant;

              if (!activeGroups.has(currentChat)) continue;

              const contextInfo = msg.message.extendedTextMessage?.contextInfo;
              const mentionedJids = contextInfo?.mentionedJid || [];
              const messageText = msg.message.extendedTextMessage?.text || msg.message.conversation || '';

              // Check if there are mentioned JIDs but the message text is empty or doesn't contain a visible mention
              const isHiddenMention = mentionedJids.length > 0 && !messageText.includes('@');

              if (isHiddenMention) {
                try {
                  // Delete the message
                  await sock.sendMessage(currentChat, {
                    delete: {
                      remoteJid: currentChat,
                      fromMe: false,
                      id: msg.key.id,
                      participant: sender
                    }
                  });

                  // Load warnings from the new file
                  let storedWarnings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                  let senderWarnings = storedWarnings[sender] || 0;
                  senderWarnings++;
                  storedWarnings[sender] = senderWarnings;
                  fs.writeFileSync(filePath, JSON.stringify(storedWarnings), 'utf8');

                  // Issue a warning
                  if (senderWarnings < 3) {
                    await sock.sendMessage(currentChat, {
                      text: `⚠️ تحذير ${senderWarnings}/3 🚨\nتم اكتشاف منشن مخفي.`
                    });
                  } else {
                    // Kick the participant
                    await sock.groupParticipantsUpdate(currentChat, [sender], 'remove');
                    await sock.sendMess