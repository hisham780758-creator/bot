const { fork } = require('child_process');
const { join } = require('path');
const fs = require('fs-extra');

function startBot() {
    const connectionFolder = join(process.cwd(), 'ملف_الاتصال');
    
    if (!fs.existsSync(connectionFolder)) {
        fs.ensureDirSync(connectionFolder);
        console.log('⚠️ تم إنشاء مجلد الاتصال تلقائياً...');
    }

    console.log('🚀 جاري تشغيل البوت وإدارته 24/7...');
    const child = fork(join(__dirname, 'main.js'), [], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        env: { ...process.env, CONNECTION_FOLDER: connectionFolder }
    });

    child.on('exit', (code) => {
        console.log(`⚠️ توقف البوت (رمز الكود: ${code}). جاري إعادة التشغيل خلال 5 ثواني...`);
        setTimeout(startBot, 5000);
    });

    child.on('error', (err) => {
        console.log(`❌ حدث خطأ: ${err}`);
        setTimeout(startBot, 5000);
    });
}

startBot();
