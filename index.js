const { fork } = require('child_process');
const { join } = require('path');
const fs = require('fs-extra');

function startBot() {
    console.log('🚀 [SUPERVISOR] Starting bot via index.js...');
    
    const child = fork(join(__dirname, 'main.js'), [], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    child.on('exit', (code) => {
        console.log(`⚠️ Bot process exited with code ${code}. Restarting in 5s...`);
        setTimeout(startBot, 5000);
    });

    child.on('error', (err) => {
        console.log(`❌ Bot process error: ${err}`);
        setTimeout(startBot, 5000);
    });
}

startBot();
