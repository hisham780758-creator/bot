console.log("🚀 Starting Bot Supervisor...");
const { fork } = require('child_process');
const path = require('path');

function start() {
    const p = fork(path.join(__dirname, 'main.js'));
    p.on('exit', (code) => {
        console.log(`⚠️ Process exited with code ${code}, restarting...`);
        setTimeout(start, 3000);
    });
}

start();
