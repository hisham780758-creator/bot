import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    command: 'help',
    desc: 'عرض الأوامر',
    
    async execute(sock, message, args) {
        const pluginsDir = __dirname;
        const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
        
        let msg = '📋 *الأوامر:*\n\n';
        for (const file of files) {
            try {
                const module = await import(`./${file}`);
                const cmd = module.default;
                if (cmd.command) {
                    msg += `▫️ /${cmd.command} - ${cmd.desc || 'لا يوجد وصف'}\n`;
                }
            } catch (e) {}
        }
        
        await sock.sendMessage(message.chat, { text: msg });
    }
};
