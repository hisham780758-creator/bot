const { fork } = require('child_process');
const { join } = require('path');
const fs = require('fs-extra');

function startBot() {
    const connectionFolder = join(process.cwd(), 'ملف_الاتصال');
    console.log('🚀 جاري تشغيل البوت...');

    const child = fork(join(__dirname, 'main.js'), [], {
        stdio: 'inherit',
        env: { ...process.env, CONNECTION_FOLDER: connectionFolder }
    });

    child.on('exit', () => {
        console.log('🔄 إعادة تشغيل البوت...');
        setTimeout(startBot, 3000);
    });
}

startBot();
