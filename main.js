const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore 
} = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const pino = require('pino');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const { exec } = require('child_process');
const { Boom } = require('@hapi/boom');
const logger = require('./utils/console');

const question = text => new Promise(resolve => {
    // إذا لم تكن البيئة تفاعلية (مثل السيرفرات السحابية)، تجاوز السؤال لتفادي التوقف
    if (!process.stdin.isTTY) {
        return resolve(process.env.PHONE_NUMBER || "967780758757");
    }
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(text, answer => {
        rl.close();
        resolve(answer);
    });
});

const asciiArt = `
${chalk.hex('#FFD700')(' █████╗ ███╗   ██╗ █████╗ ███████╗████████╗ █████╗ ███████╗██╗ █████╗ ')}
${chalk.hex('#FFD700')('██╔══██╗████╗  ██║██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║██╔══██╗')}
${chalk.hex('#FFD700')('███████║██╔██╗ ██║███████║███████╗   ██║   ███████║███████║██║███████║')}
${chalk.hex('#FFD700')('██╔══██║██║╚██╗██║██╔══██║╚════██║   ██║   ██╔══██║╚════██║██║██╔══██║')}
${chalk.hex('#FFD700')('██║  ██║██║ ╚████║██║  ██║███████║   ██║   ██║  ██║███████║██║██║  ██║')}
${chalk.hex('#FFD700')('╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═╝')}
`;

function playSound(name) {
    try {
        const controlPath = path.join(__dirname, 'sounds', 'sound.txt');
        const status = fs.existsSync(controlPath) ? fs.readFileSync(controlPath, 'utf-8').trim() : 'off';
        if (status !== '{on}') return;
        const filePath = path.join(__dirname, 'sounds', name);
        if (fs.existsSync(filePath)) {
            exec(`mpv --no-terminal --really-quiet "${filePath}"`, () => {});
        }
    } catch (e) {
        // تجاهل أخطاء تشغيل الصوت في البيئات السحابية
    }
}

async function startBot() {
    try {
        console.log(asciiArt);
        console.log(chalk.hex('#FFD700').bold('\n𝑆𝐻𝐴𝑁𝐾𝑆!\n'));

        playSound('ANASTASIA.mp3');

        // مسار مجلد الاتصال المتوافق مع index.js (process.env.CONNECTION_FOLDER) أو المجلد المحلي
        const sessionDir = process.env.CONNECTION_FOLDER || path.join(__dirname, 'ملف_الاتصال');
        await fs.ensureDir(sessionDir);

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
            },
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.04.0'],
            logger: pino({ level: 'silent' }),
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true
        });

        sock.ev.on('groups.upsert', async (groups) => {
            for (const group of groups) {
                try {
                    await sock.groupMetadata(group.id);
                    console.log(`[+] تم تحميل بيانات مجموعة: ${group.subject}`);
                } catch (err) {
                    console.warn(`[-] فشل في تحميل بيانات مجموعة: ${group.id}`);
                }
            }
        });

        // طلب كود الاقتران إذا لم يكن الجهاز مسجلاً
        if (!sock.authState.creds.registered) {
            console.log(chalk.bold('\n[ SETUP ] Please enter your phone number to receive the pairing code:'));
            console.log(chalk.dim('          (Type "#" to cancel)\n'));

            let phoneNumber = await question(chalk.bgHex('#FFD700').black(' Phone Number : '));
            if (phoneNumber && phoneNumber.trim() === '#') process.exit();

            phoneNumber = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : (process.env.PHONE_NUMBER || "967780758757");
            
            if (!phoneNumber.match(/^\d{10,15}$/)) {
                console.log("\n[ ERROR ] Invalid phone number.\n");
                process.exit(1);
            }

            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
                    console.log('\n────────── Pairing Information ──────────');
                    console.log(`🔑 Pairing Code: ${formattedCode}`);
                    console.log(`📱 Phone Number: ${phoneNumber}`);
                    console.log('─────────────────────────────────────────\n');
                } catch (error) {
                    console.log("\n[ ERROR ] Failed to get pairing code:", error.message, "\n");
                    process.exit(1);
                }
            }, 6000);
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
                        logger.info(`ADDED ${botNumber} AND ${lidNumber} TO ELITE!`);
                    }
                } catch (e) {
                    logger.error('فشل في إضافة رقم الجلسة إلى النخبة:', e.message);
                }

                // إبلاغ المشرف index.js أن البوت جاهز وعمل بنجاح
                if (process.send) process.send('ready');

                // تحميل المعالجات الأساسية عند فتح الاتصال
                try {
                    require('./handlers/handler').handleMessagesLoader();
                } catch (e) {}

                // تفعيل الترحيب وانضمام الأعضاء
                try {
                    const welcome = require('./handlers/welcome');
                    sock.ev.on('group-participants.update', async (updateEvent) => {
                        await welcome(sock, updateEvent);
                    });
                } catch (e) {}

                // تفعيل رادار طلبات الانضمام (Joining)
                try {
                    const Joining = require('./handlers/Joining');
                    sock.ev.on('group-join-request', async (updateEvent) => {
                        await Joining(sock, updateEvent);
                    });
                    logger.success('[+] تم تفعيل رادار طلبات الانضمام (Joining) بنجاح.');
                } catch (e) {
                    logger.error('[-] فشل تحميل ملف Joining:', e);
                }

                listenToConsole(sock);
            }

            if (connection === 'close') {
                const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut;
                logger.warn(`Disconnected: ${lastDisconnect?.error?.message || 'Unknown reason'}, Code: ${statusCode}`);

                if (isLoggedOut) {
                    playSound('LOGGOUT.mp3');
                    logger.error('You have been logged out manually. Removing session...');
                    try {
                        await fs.remove(sessionDir);
                        logger.success('🗑️ تم حذف مجلد الاتصال القديم بنجاح.');
                    } catch (err) {
                        logger.error('❌ فشل في حذف مجلد الجلسة:', err);
                    }
                    process.exit(1);
                } else {
                    playSound('ERROR.mp3');
                    logger.info('Reconnecting...');
                    // إبلاغ index.js بإعادة التشغيل
                    if (process.send) {
                        process.send('reset');
                    } else {
                        setTimeout(startBot, 3000);
                    }
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            try {
                const { handleMessages } = require('./handlers/handler');
                await handleMessages(sock, m);
            } catch (err) {
                logger.error('Error while handling message:', err);
                playSound('ERROR.mp3');
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
    if (!process.stdin.isTTY) return;
    try {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.on('line', (line) => {
            console.log('[ CMD ] Unknown command.');
        });
    } catch (e) {}
}

startBot();

