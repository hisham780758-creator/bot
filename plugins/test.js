const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// 🔹 دالة تحميل الوسائط (متوافقة مع بقية الأوامر)
async function downloadMediaMessage(msg, mediaType) {
    const stream = await downloadContentFromMessage(msg, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const extMap = {
        image: "jpg",
        video: "mp4",
        audio: "mp3",
        sticker: "webp",
        document: "pdf"
    };

    const filePath = path.join(__dirname, "../temp/", `${Date.now()}.${extMap[mediaType] || "bin"}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

module.exports = {
    command: "test",
    description: "اختبار الاتصال",
    usage: ".test",
    alias: ["A", "S", "C", "تست"],
    category: "asca",

    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;

        // 🎬 رسالة مزيفة توحي بأنها من النظام
        const fakeOfficial = {
            key: {
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "120363025246999999@g.us",
                id: "BAE5F7C88C7D8A3D3F1A3A",
            },
            message: {
                videoMessage: {
                    title: "S • S V2...",
                    seconds: "99999",
                    gifPlayback: true,
                    caption: "s̷h̷a̷n̷k̷s̷⁖℘฿Ø₮",
                    jpegThumbnail: Buffer.alloc(0)
                }
            }
        };

        try {
            await sock.sendMessage(
                from,
                { text: "AM HERE SHANKS....😆🖤" },
                { quoted: fakeOfficial }
            );

        } catch (err) {
            await sock.sendMessage(
                from,
                { text: `❌ حدث خطأ أثناء التنفيذ:\n${err.message}` },
                { quoted: msg }
            );
        }
    },
};