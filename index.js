const { fork } = require('child_process');
const { join } = require('path');
const fs = require('fs-extra');

function startBot() {
    const connectionFolder = join(process.cwd(), 'ملف_الاتصال');
    if (!fs.existsSync(connectionFolder)) {
        fs.ensureDirSync(connectionFolder);
    }
    
    console.log('🚀 Starting bot supervisor...');
    const child = fork(join(__dirname, 'main.js'), [], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        env: { ...process.env, CONNECTION_FOLDER: connectionFolder }
    });

    child.on('exit', (code) => {
        console.log(`⚠️ Bot exited with code ${code}. Restarting in 5s...`);
        setTimeout(startBot, 5000);
    });

    child.on('error', (err) => {
        console.log(`❌ Error: ${err}`);
        setTimeout(startBot, 5000);
    });
}

startBot();
