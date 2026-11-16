const { isElite } = require('../haykala/elite');
const { setGroups } = require('../utils/remoteGroups');

module.exports = {
  command: 'المجموعات',
  category: 'admin',
  description: 'عرض جميع المجموعات مع أرقام مؤقتة للتحكم عن بعد',

  async execute(sock, msg) {
    const chatId = msg.key.remoteJid;

    const sender =
      msg.key.participant ||
      msg.participant ||
      msg.key.remoteJid;

    if (!isElite(sender)) {
      return sock.sendMessage(chatId, {
        text:
          '✧═════ـ 𝒇𝒓𝒐𝒔𝒕 𝒂𝒅𝒎𝒊𝒏 ـ═════✧\n' +
          '✧❄️❯ءٰٖ ليس لديك صلاحية\n' +
          '✧═════•❁❄️❁•═════✧'
      }, { quoted: msg });
    }

    let groups;

    try {
      const result = await sock.groupFetchAllParticipating();
      groups = Object.values(result);
    } catch (error) {
      console.error('❌ خطأ في جلب المجموعات:', error);

      return sock.sendMessage(chatId, {
        text:
          '✧═════ـ 𝒇𝒓𝒐𝒔𝒕 𝒂𝒅𝒎𝒊𝒏 ـ═════✧\n' +
          '✧❄️❯ءٰٖ تعذر جلب المجموعات\n' +
          '✧═════•❁❄️❁•═════✧'
      }, { quoted: msg });
    }

    const groupList = groups.map(group => ({
      id: group.id,
      subject: group.subject || 'بدون اسم'
    }));

    setGroups(groupList);

    let text =
      '✧═════ـ 𝒇𝒓𝒐𝒔𝒕 𝒂𝒅𝒎𝒊𝒏 ـ═════✧\n' +
      '✧❄️❯ءٰٖ 𝑭𝑹𝑶𝑺𝑻 𝑮𝑹𝑶𝑼𝑷 𝑳𝑰𝑺𝑻\n' +
      '✧═════•❁❄️❁•═════✧\n';

    groupList.forEach((group, index) => {
      text += `『${index + 1}』 ❄️ ${group.subject}\n`;
      text += '✧═════•❁❄️❁•═════✧\n';
    });

    text += `📊 العدد: ${groupList.length}`;

    return sock.sendMessage(chatId, { text }, { quoted: msg });
  }
};