const { fork } = require('child_process');
const { join } = require('path');
const fs = require('fs-extra');
const logger = require('./utils/console');

const maxRetries = 3;
const retryDelay = 5000;

let isRunning = false;
let retryCount = 0;

function handleConnection(retry = 0) {
    const currentPath = process.cwd();
    const connectionFolder = join(currentPath, 'ملف_الاتصال');

    // التأكد من إنشاء مجلد الاتصال تلقائياً إذا لم يكن موجوداً لتجنب الأخطاء
    if (!fs.existsSync(connectionFolder)) {
        fs.ensureDirSync(connectionFolder);
        logger.warn('⚠️ تم إنشاء مجلد الاتصال "ملف_الاتصال" تلقائياً...');
    }

    if (isRunning) return;
    isRunning = true;
    logger.info('🚀 جاري تهيئة البوت وتشغيله...');

    const child = fork(join(__dirname, 'main.js'), [], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        env: {
            ...process.env,
            CONNECTION_FOLDER: connectionFolder
        }
    });

    child.on('message', (data) => {
        if (data === 'ready') {
            retryCount = 0;
            logger.success('✅ تم تشغيل البوت بنجاح واتصاله مستقر!');
        } else if (data === 'reset') {
            logger.warn('🔄 إعادة تشغيل البوت بطلب منه...');
            child.kill();
            setTimeout(() => handleConnection(0), 2000);
        } else if (data === 'uptime') {
            child.send(process.uptime());
        }
    });

    child.on('exit', async (code) => {
        isRunning = false;

        if (code === 0) {
            logger.info('✅ تم إغلاق البوت بشكل طبيعي.');
            return;
        }

        
