/**
 * Leave a Discord Server
 *
 * Usage: node leave-server.js <server_id>
 *
 * To get server IDs, first run: node get-guilds.js
 */

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ]
});

const serverId = process.argv[2];

if (!serverId) {
  console.log('❌ Please provide a server ID');
  console.log('Usage: node leave-server.js <server_id>');
  console.log('');
  console.log('To find server IDs, run: node get-guilds.js');
  process.exit(1);
}

client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log('');

  try {
    const guild = client.guilds.cache.get(serverId);

    if (!guild) {
      console.log(`❌ Server not found with ID: ${serverId}`);
      console.log('');
      console.log('Available servers:');
      client.guilds.cache.forEach(g => {
        console.log(`  ${g.name} (${g.id})`);
      });
      process.exit(1);
    }

    console.log(`Found server: ${guild.name}`);
    console.log(`Members: ${guild.memberCount}`);
    console.log('');
    console.log('⚠️  Are you sure you want to leave this server?');
    console.log('');

    // Give 5 seconds to cancel with Ctrl+C
    console.log('Starting in 5 seconds... (Press Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Leaving server...');
    await guild.leave();

    console.log(`✅ Successfully left server: ${guild.name}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
