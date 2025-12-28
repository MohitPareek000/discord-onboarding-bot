require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log('Bot is in these servers:\n');
  client.guilds.cache.forEach(guild => {
    console.log(`Name: ${guild.name}`);
    console.log(`ID: ${guild.id}`);
    console.log('---');
  });
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
