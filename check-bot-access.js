const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: ['CHANNEL']
});

client.once('ready', async () => {
  console.log('===== BOT TOKEN INFORMATION =====');
  console.log('Bot Username:', client.user.tag);
  console.log('Bot ID:', client.user.id);
  console.log('Bot Created:', client.user.createdAt);
  console.log('');
  console.log('===== SERVERS (GUILDS) =====');
  console.log('Total Servers:', client.guilds.cache.size);
  console.log('');

  for (const guild of client.guilds.cache.values()) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Server Name:', guild.name);
    console.log('🆔 Server ID:', guild.id);
    console.log('👥 Member Count:', guild.memberCount);
    console.log('👑 Owner ID:', guild.ownerId);

    try {
      const owner = await guild.fetchOwner();
      console.log('👑 Owner:', owner.user.tag);
    } catch (e) {
      console.log('👑 Owner: Unable to fetch');
    }

    const botMember = guild.members.cache.get(client.user.id);
    if (botMember) {
      console.log('');
      const roleNames = botMember.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ');
      console.log('🤖 Bot Role(s):', roleNames || 'None (only @everyone)');
      console.log('🔑 Has Administrator:', botMember.permissions.has('Administrator') ? 'YES' : 'NO');
      console.log('');
      console.log('📋 Key Permissions:');
      const keyPerms = ['ManageChannels', 'ManageRoles', 'ManageGuild', 'KickMembers', 'BanMembers', 'ManageMessages', 'ViewChannel', 'SendMessages', 'CreateInstantInvite', 'ManageWebhooks'];
      keyPerms.forEach(perm => {
        if (botMember.permissions.has(perm)) {
          console.log('  ✅', perm);
        }
      });
    }

    console.log('');
    console.log('📺 Channels:', guild.channels.cache.size);
    const textChannels = guild.channels.cache.filter(c => c.type === 0);
    console.log('  Text Channels:', textChannels.size);
    if (textChannels.size > 0) {
      const channelList = textChannels.map(c => '#' + c.name).slice(0, 10).join(', ');
      console.log('  Channel names:', channelList + (textChannels.size > 10 ? '...' : ''));
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  client.destroy();
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Failed to login:', err.message);
  process.exit(1);
});
