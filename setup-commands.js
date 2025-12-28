/**
 * Setup Slash Commands
 *
 * Run this ONCE to register slash commands with Discord.
 *
 * Usage: node setup-commands.js
 */

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');

const commands = [
  // Create a course invite link
  new SlashCommandBuilder()
    .setName('create-course-invite')
    .setDescription('Create an invite link for a specific course channel')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The course channel to create invite for')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption(option =>
      option
        .setName('send-to')
        .setDescription('Users to send invite to (mention multiple: @user1 @user2 @user3)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(0) // Admin only
    .toJSON(),

  // List all course invites
  new SlashCommandBuilder()
    .setName('list-course-invites')
    .setDescription('List all active course invite links')
    .setDefaultMemberPermissions(0) // Admin only
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');

    const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString();

    // Register commands for specific guilds (instant) instead of global (up to 1 hour)
    const guildIds = [
      '1436036949176619081', // SCALER-SDE-LMS
      '1436037202982338701', // SCALER-DSML-LMS
      '1436037456012251198', // SCALER-DEVOPS-LMS
      '1436037709322784930', // SCALER-AIML-LMS
      '1454047776940752969'  // Testing server
    ];

    for (const guildId of guildIds) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands },
        );
        console.log(`✅ Registered commands for guild: ${guildId}`);
      } catch (err) {
        console.log(`❌ Failed for guild ${guildId}: ${err.message}`);
      }
    }

    console.log('Slash commands registered successfully!');
    console.log('');
    console.log('Available commands:');
    console.log('  /create-course-invite  - Create invite link for a course');
    console.log('  /list-course-invites   - List all course invites');
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
