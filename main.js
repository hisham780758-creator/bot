const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const pino = require('pino');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const { exec } = require('child_process');
const logger = require('./utils/console');

// 🛡️ عزل تام للأخطاء القاتلة لمنع توقف أو تجميد ترمكس نهائياً دون المساس بالملفات
process.on('uncaughtException', (err) => {
    const errStr = String(err);
    if (errStr.includes('Bad MAC') || errStr.includes('ENOENT') || errStr.includes('session')) {
        return; // تجاهل أخطاء الجلسة والتشفير بصمت ليبقى البوت شغالاً 24/7
    }
    logger.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
    const errStr = String(reason);
    if (errStr.includes('Bad MAC') || errStr.includes('ENOENT') || errStr.includes('session')) {
        return;
    }
    logger.error('Unhandled Rejection:', reason);
});

// باقي المعالجات...
const { handleMessages } = require('./handlers/handler');
const Joining = require('./handlers/Joining');
const { initAntiContacts } = require('./handlers/anti_contacts');
const welcome = require('./handlers/welcome');
const startPeriodicScan = require('./handlers/periodic');
const { initSecurityListener } = require('./handlers/SecurityHandler');
const { initAntiTourism } = require('./handlers/anti_tourism');

const messageStore = new Map();

const asciiArt = `
${chalk.hex('#FFD700')(' █████╗ ███╗   ██╗ █████╗ ███████╗████████╗ █████╗ ███████╗██╗ █████╗ ')}
${chalk.hex('#FFD700')('██╔══██╗████╗  ██║██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║██╔══██╗')}
${chalk.hex('#FFD700')('███████║██╔██╗ ██║███████║███████╗   ██║   ███████║███████║██║███████║')}
${chalk.hex('#FFD700')('██╔══██║██║╚██╗██║██╔══██║╚════██║   ██║   ██╔══██║╚════██║██║██╔══██║')}
${chalk.hex('#FFD700')('██║  ██║██║ ╚████║██║  ██║███████║   ██║   ██║  ██║███████║██║██║  ██║')}
${chalk.hex('#FFD700')('╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═╝')}
`;

function playSound(name) {
    const controlPath = path.join(__dirname, 'sounds', 'sound.txt');
    const status = fs.existsSync(controlPath) ? fs.readFileSync(controlPath, 'utf-8').trim() : 'off';
    if (status !== '{on}') return;
    const filePath = path.join(__dirname, 'sounds', name);
    if (fs.existsSync(filePath)) exec(`mpv --no-terminal --really-quiet "${filePath}"`);
}

async function startBot() {
    try {
        console.clear();
        console.log(asciiArt);
        console.log(chalk.hex('#FFD700').bold('\n𝑺𝑶𝑵𝑮! (ULTRA SPEED & ZERO LAG)\n'));

        playSound('ANASTASIA.mp3');

        // 🔍 ميزة ذكية: الكشف التلقائي عن المجلد الموجود فعلياً (سواء session أو ملف_الاتصال) دون حذف أو إضرار بالملفات
        const path1 = path.join(__dirname, 'session');
        const path2 = path.join(__dirname, 'ملف_الاتصال');
        
        let sessionDir = path1;
        if (fs.existsSync(path2) && !fs.existsSync(path1)) {
            sessionDir = path2;
        } else if (!fs.existsSync(path1) && !fs.existsSync(path2)) {
            sessionDir = path1; // الافتراضي إذا لم يوجد أي منهما
        }

        await fs.ensureDir(sessionDir);

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['MacOs', 'Chrome', '1.0.0'],
            logger: pino({ level: 'silent' }),
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false,
            syncFullHistory: false, 
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 15000,
            retryRequestDelayMs: 100,
            getMessage: async (key) => {
                if (messageStore.has(key.id)) {
                    return messageStore.get(key.id) || { conversation: '' };
                }
                return { conversation: '' };
            }
        });

        const originalSendMessage = sock.sendMessage;
        sock.sendMessage = async (jid, content, options = {}) => {
            try {
                const sent = await originalSendMessage.call(sock, jid, content, options);
                if (sent) {
                    const keyId = sent.key?.id || sent.id;
                    const msgContent = sent.message || (content.text ? { conversation: content.text } : content);
                    if (keyId) {
                        messageStore.set(keyId, msgContent);
                        if (messageStore.size > 2000) {
                            const firstKey = messageStore.keys().next().value;
                            messageStore.delete(firstKey);
                        }
                    }
                }
                return sent;
            } catch (err) {
                throw err;
            }
        };

        sock.ev.on('groups.upsert', async (groups) => {
            for (const group of groups) {
                try {
                    await sock.groupMetadata(group.id);
                } catch (err) {}
            }
        });

        if (!sock.authState.creds.registered) {
            console.log(chalk.bold('\n[ SETUP ] Requesting pairing code automatically...'));

            let phoneNumber = "967780758757";

            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            if (!phoneNumber.match(/^\d{10,15}$/)) {
                console.log("\n[ ERROR ] Invalid phone number in code.\n");
                process.exit(1);
            }

            try {
                // إضافة مهلة انتظار 3 ثوانٍ لضمان استقرار الاتصال قبل طلب الرمز
                await new Promise(resolve => setTimeout(resolve, 3000));
                const code = await sock.requestPairingCode(phoneNumber);
                console.log('\n────────── Pairing Information ──────────');
                console.log(`Pairing Code: ${code}`);
                console.log(`Phone Number: ${phoneNumber}`);
                console.log('─────────────────────────────────────────\n');
            } catch (error) {
                console.log("\n[ ERROR ] Failed to get pairing code.\n");
                process.exit(1);
            }
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'connecting') {
                logger.info('Connecting to WhatsApp...');
            }

            if (connection === 'open') {
                logger.success(`CONNECTED! USER ID: ${sock.user.id}`);

                try {
                    const { addEliteNumber } = require('./haykala/elite');
                    const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
                    const jid = `${botNumber}@s.whatsapp.net`;

                    const [info] = await sock.onWhatsApp(jid);
                    if (info?.jid && info?.lid) {
                        const lidNumber = info.lid.replace(/[^0-9]/g, '');
                        await addEliteNumber(botNumber);   
                        await addEliteNumber(lidNumber);   
                    }
                } catch (e) {}

                require('./handlers/handler').handleMessagesLoader();

                try {
                    initAntiContacts(sock);
                    logger.success('[+] تم تفعيل نظام anti_contacts اللحظي بنجاح.');
                } catch (e) {
                    logger.error('[-] فشل تشغيل نظام anti_contacts:', e);
                }

                sock.ev.on('group-participants.update', async (updateEvent) => {
                    await welcome(sock, updateEvent);
                });

                startPeriodicScan(sock);

                try {
                    initSecurityListener(sock);
                } catch (e) {}

                try {
                    initAntiTourism(sock);
                    logger.success('[+] تم تفعيل رادار السياحة بنجاح.');
                } catch (e) {
                    logger.error('[-] فشل تشغيل رادار السياحة:', e);
                }

                listenToConsole(sock);
            }

            if (connection === 'close') {
                const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
                logger.warn(`Disconnected: ${lastDisconnect?.error?.message || 'Unknown reason'}`);

                if (isLoggedOut) {
                    playSound('LOGGOUT.mp3');
                    process.exit(1);
                } else {
                    logger.info('Reconnecting...');
                    setTimeout(startBot, 3000);
                }
            }
        });

        sock.ev.on('messages.upsert', (m) => {
            try {
                const messages = m.messages || [];
                if (messages.length === 0) return;

                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    if (msg.key && msg.message) {
                        messageStore.set(msg.key.id, msg.message);
                        if (messageStore.size > 2000) {
                            const firstKey = messageStore.keys().next().value;
                            messageStore.delete(firstKey);
                        }
                    }
                }

                setImmediate(() => {
                    handleMessages(sock, m).catch(err => {
                        logger.error('Error while handling message:', err);
                        playSound('ERROR.mp3');
                    });
                });

                setImmediate(() => {
                    Joining(sock, m).catch(() => {});
                });

            } catch (err) {
                logger.error('Error in messages event:', err);
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (err) {
        logger.error('Startup error:', err);
        playSound('ERROR.mp3');
        setTimeout(startBot, 3000);
    }
}

function listenToConsole(sock) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', (line) => {});
}

startBot();
