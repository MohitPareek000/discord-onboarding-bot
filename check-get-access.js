require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('ready', async () => {
  console.log('Checking for #get-access channel in all servers:\n');

  for (const guild of client.guilds.cache.values()) {
    console.log(`\n📍 Server: ${guild.name} (${guild.id})`);

    const getAccessChannel = guild.channels.cache.find(ch => ch.name === 'get-access');

    if (getAccessChannel) {
      console.log(`   ✅ #get-access exists! (ID: ${getAccessChannel.id})`);
    } else {
      console.log(`   ❌ #get-access NOT FOUND`);
      console.log(`   📝 To create: Right-click server → Create Channel → Name it "get-access"`);
    }
  }

  console.log('\n');
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
