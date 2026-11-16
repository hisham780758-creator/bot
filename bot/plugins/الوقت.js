module.exports = {
  command: 'الوقت',
  description: 'يعرض الوقت والتاريخ الحالي',
  usage: '.الوقت',
  category: 'general',

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;

    const date = new Date();
    const timeStr = date.toLocaleTimeString('ar-EG', { hour12: false });
    const dateStr = date.toLocaleDateString('ar-EG');

    const formatted = `*⌇𝐶𝑂𝑀𝑀𝐴𝑁𝐷 𝐺𝐸𝑁𝐸𝑅𝐴𝐿 ⌇*\n\n` +
                      `*┃╻⏰╹↵ ※الـوقـت※↶*\n*「 ${timeStr} 」*\n\n` +
                      `*┃╻📅╹↵ ※الـتـاريـخ※↶*\n*「 ${dateStr} 」*\n\n` +
                      `> *˼‏❖˹↵ يـومـك سـعـيـد ☕*`;

    await sock.sendMessage(chatId, { text: formatted }, { quoted: msg });
  }
};