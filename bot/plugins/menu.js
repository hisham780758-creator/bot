const { getPlugins } = require('../handlers/plugins.js');
const path = require('path');
const fs = require('fs');

const imagePath = path.join(__dirname, '../image.jpeg');
const thumbnail = fs.readFileSync(imagePath);

module.exports = {
    command: "اوامر",
    description: "⌯︙لعرض قائمة الأوامر حسب الفئة - اكتب .اوامر أو .اوامر [اسم الفئة]",
    usage: ".اوامر [الفئة]",
    alias: ["commands", "help", "menu", "اوامر"],
    category: "tools",
    version: "3.2",
    hidden: false,

    async execute(sock, msg, args) {
        // التوثيق الوهمي
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
                    caption: "𝑺𝑶𝑵𝑮̷⁖℘฿Ø₮",
                    jpegThumbnail: Buffer.alloc(0)
                }
            }
        };

        try {
            const body = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
            const inputArgs = body.trim().split(" ").slice(1);
            const plugins = getPlugins();
            const categories = {};
            const excludedCategories = ["zarf", "misc", "tools", "غير مصنفة"];

            Object.values(plugins).forEach(plugin => {
                if (plugin.hidden) return;
                const category = plugin.category?.toLowerCase() || "غير مصنفة";
                if (excludedCategories.includes(category)) return;

                if (!categories[category]) categories[category] = [];

                let commandDisplay = "";

                if (Array.isArray(plugin.command) && plugin.command.length > 1) {
                    commandDisplay = `- ${plugin.command
                        .map(cmd => `\`${cmd}\``)
                        .join(" - ")}`;
                } else {
                    const cmd = Array.isArray(plugin.command)
                        ? plugin.command[0]
                        : plugin.command;
                    commandDisplay = `- \`${cmd}\``;
                }

                if (plugin.description) {
                    commandDisplay += `\nالوصف: \`\`\`${plugin.description}\`\`\``;
                }

                categories[category].push(commandDisplay + "\n");
            });

            let menu = "";

            // ✅ بدون فئة → عرض الفئات فقط
            if (inputArgs.length === 0) {
                menu += "*┃╻🐣╹↵ ٭ بـوت شانكس يـرحـب بـيـكـم*\n\n";
                menu += "┣━━━━━━━━━━━━━━━ ┅ ━┣\n\n";
                menu += " *الـفـئــات المـتـوفـرة:*\n\n";

                for (const cat of Object.keys(categories)) {
                    menu += `│ ┃❄️╻╹↵ ٭ \`${cat}\`\n`;
                }

                menu += "\n┣━━━━━━━━━━━━━━━ ┅ ━┣\n";
                menu += "*اكـتـب `.اوامر [اســم الـفـئـة]` لـعــرض أوامـرهــا.*\n\n";
                menu += "┣━━━━━━━━━━━━━━━ ┅ ━┣\n";
                menu += "> *「❖𝑺𝑶𝑵𝑮 𝑩𝑶𝑻 ❖」*";

                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        image: thumbnail,
                        caption: menu
                    },
                    { quoted: fakeOfficial }
                );

                return;
            }

            // ✅ مع فئة → عرض أوامر الفئة
            const requestedCategory = inputArgs.join(" ").toLowerCase();

            if (!categories[requestedCategory]) {
                return await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        text: `❌ الفئة *${requestedCategory}* غير موجودة.\nاكتب \`.اوامر\` لعرض الفئات المتاحة.`
                    },
                    { quoted: fakeOfficial }
                );
            }

            menu += "*˼‏❄️˹ اوامـر الفـئـة لـي طـلبـت يـا إمـبراطـور ˼‏❄️˹*\n";
            menu += "*‏⎔ ٠ ┈─ ━╼ • ◞☁️◜ • ╾━ ─┈‏ ٠ ⎔*\n";

            categories[requestedCategory].forEach(cmdText => {
                const match = cmdText.match(/`([^`]+)`/);
                const cmdName = match ? match[1] : "غير معروف";

                menu += `*┃╻🍃╹↵ ٭ ₊˚⊹ إسـم الأمـر ₊˚⊹ :『${cmdName}』*\n`;
            });

            menu += "*‏⎔ ٠ ┈─ ━╼ • ◞☁️◜ • ╾━ ─┈‏ ٠ ⎔*";

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    image: thumbnail,
                    caption: menu
                },
                { quoted: fakeOfficial }
            );

        } catch (error) {
            console.error("❌ Menu Error:", error);
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: "❌ حدث خطأ أثناء إنشاء القائمة.\nتحقق من وجود الملف image.jpeg في مجلد البوت."
                },
                { quoted: fakeOfficial }
            );
        }
    }
};