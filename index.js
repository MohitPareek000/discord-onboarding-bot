/**
 * Discord Onboarding Bot
 *
 * SETUP INSTRUCTIONS:
 * 1. Install Node.js v18 or higher
 * 2. Run: npm install
 * 3. Create a .env file with the following variables:
 *    - DISCORD_TOKEN=your_discord_bot_token
 *    - SPREADSHEET_ID=your_google_spreadsheet_id
 *    - GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
 *    - LEARNER_ROLE_NAME=Learner
 * 4. Download your Google Service Account JSON key and save it as credentials.json
 * 5. Run: node index.js
 *
 * The bot will track invite links and onboard new members through DM.
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { appendToSheet } = require('./utils/sheets');
const { handleOnboarding } = require('./utils/onboarding');

// Validate required environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'SPREADSHEET_ID', 'GOOGLE_APPLICATION_CREDENTIALS'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Discord client with required intents
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

// Store invite codes before member joins to track which invite was used
const invites = new Collection();

// Store active onboarding sessions (userId -> session data)
const onboardingSessions = new Collection();

/**
 * Fetch and cache all invites for a guild
 */
async function cacheInvites(guild) {
  try {
    const fetchedInvites = await guild.invites.fetch();
    invites.set(guild.id, new Collection(fetchedInvites.map(invite => [invite.code, invite.uses])));
    console.log(`📋 Cached ${fetchedInvites.size} invites for guild: ${guild.name}`);
  } catch (error) {
    console.error(`❌ Error caching invites for ${guild.name}:`, error.message);
  }
}

/**
 * Detect which invite was used by comparing cached invite uses
 */
async function detectUsedInvite(guild) {
  try {
    const newInvites = await guild.invites.fetch();
    const oldInvites = invites.get(guild.id);

    if (!oldInvites) {
      return null;
    }

    // Find the invite with increased uses
    const usedInvite = newInvites.find(inv => {
      const oldUses = oldInvites.get(inv.code);
      return oldUses !== undefined && inv.uses > oldUses;
    });

    // Update cache
    invites.set(guild.id, new Collection(newInvites.map(invite => [invite.code, invite.uses])));

    return usedInvite;
  } catch (error) {
    console.error('❌ Error detecting used invite:', error.message);
    return null;
  }
}

// Bot ready event
client.once('ready', async () => {
  console.log('✅ Discord Onboarding Bot is online!');
  console.log(`🤖 Logged in as: ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);

  // Cache invites for all guilds
  for (const guild of client.guilds.cache.values()) {
    await cacheInvites(guild);
  }

  console.log('🚀 Bot is ready to onboard new members!\n');
});

// When bot joins a new guild
client.on('guildCreate', async (guild) => {
  console.log(`✨ Joined new guild: ${guild.name}`);
  await cacheInvites(guild);
});

// Update invite cache when invites are created or deleted
client.on('inviteCreate', async (invite) => {
  const guildInvites = invites.get(invite.guild.id) || new Collection();
  guildInvites.set(invite.code, invite.uses);
  invites.set(invite.guild.id, guildInvites);
  console.log(`➕ New invite created: ${invite.code}`);
});

client.on('inviteDelete', async (invite) => {
  const guildInvites = invites.get(invite.guild.id);
  if (guildInvites) {
    guildInvites.delete(invite.code);
    console.log(`➖ Invite deleted: ${invite.code}`);
  }
});

// Handle new member joins
client.on('guildMemberAdd', async (member) => {
  console.log(`\n👋 New member joined: ${member.user.tag} (${member.id})`);

  // Detect which invite was used
  const usedInvite = await detectUsedInvite(member.guild);
  let channelName = 'Unknown';
  let channelId = null;

  if (usedInvite) {
    console.log(`🔗 Used invite code: ${usedInvite.code}`);

    // Try to get channel name and ID from invite
    if (usedInvite.channel) {
      channelName = usedInvite.channel.name;
      channelId = usedInvite.channel.id;
      console.log(`📺 Channel: ${channelName} (${channelId})`);
    }

    // If invite has an inviter, log it
    if (usedInvite.inviter) {
      console.log(`👤 Invited by: ${usedInvite.inviter.tag}`);
    }
  } else {
    console.log('⚠️  Could not detect which invite was used');
  }

  // Start onboarding process via DM
  try {
    await handleOnboarding(member, channelName, channelId, onboardingSessions, client);
  } catch (error) {
    console.error(`❌ Error starting onboarding for ${member.user.tag}:`, error.message);
  }
});

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // Handle Start Onboarding button
  if (interaction.customId === 'start_onboarding') {
    const session = onboardingSessions.get(interaction.user.id);

    if (!session) {
      await interaction.reply({ content: '❌ Session not found. Please try rejoining the server.', ephemeral: true });
      return;
    }

    // Mark session as started
    session.started = true;

    // Acknowledge the button click
    await interaction.update({
      content: interaction.message.content,
      components: [] // Remove the button
    });

    // Send first question
    const { QUESTIONS, QUESTION_ORDER } = require('./utils/onboarding');
    const firstQuestion = QUESTIONS[QUESTION_ORDER[0]];

    await interaction.followUp(firstQuestion.question);
    console.log(`▶️  User ${interaction.user.tag} clicked Start Onboarding button`);
  }
});

// Handle DM messages for onboarding responses
client.on('messageCreate', async (message) => {
  // Ignore bot messages and guild messages
  if (message.author.bot || message.guild) return;

  // Check if user has an active onboarding session
  const session = onboardingSessions.get(message.author.id);
  if (!session) return;

  // Don't process messages if user hasn't clicked Start button yet
  if (!session.started) {
    return;
  }

  const { handleResponse } = require('./utils/onboarding');

  try {
    await handleResponse(message, session, onboardingSessions, client);
  } catch (error) {
    console.error(`❌ Error handling onboarding response:`, error.message);
    await message.channel.send('⚠️ An error occurred. Please try again or contact an administrator.').catch(() => {});
  }
});

// Error handling
client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('❌ Failed to login to Discord:', error.message);
  process.exit(1);
});
