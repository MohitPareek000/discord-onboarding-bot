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

    // Register commands globally (available on all servers)
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log('✅ Global slash commands registered successfully!');
    console.log('⏳ Note: Global commands can take up to 1 hour to appear/update across all servers.');
    console.log('');
    console.log('Available commands:');
    console.log('  /create-course-invite  - Create invite link for a course');
    console.log('  /list-course-invites   - List all course invites');
    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
