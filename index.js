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
const { Client, GatewayIntentBits, Partials, Collection, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { handleOnboarding } = require('./utils/onboarding');
const { addMapping, getMapping, getMappingsForGuild } = require('./utils/inviteManager');
const { verifyPaidLearner } = require('./utils/emailVerification');
const { appendToSheet } = require('./utils/sheets');

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
  partials: [Partials.Channel, Partials.Message, Partials.User]
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
 * Returns { invite, isNew } where isNew indicates if uses increased
 */
async function detectUsedInvite(guild, updateCache = true) {
  try {
    const newInvites = await guild.invites.fetch();
    const oldInvites = invites.get(guild.id);

    if (!oldInvites) {
      if (updateCache) {
        invites.set(guild.id, new Collection(newInvites.map(invite => [invite.code, invite.uses])));
      }
      return null;
    }

    // Find the invite with increased uses
    const usedInvite = newInvites.find(inv => {
      const oldUses = oldInvites.get(inv.code);
      return oldUses !== undefined && inv.uses > oldUses;
    });

    // Update cache
    if (updateCache) {
      invites.set(guild.id, new Collection(newInvites.map(invite => [invite.code, invite.uses])));
    }

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

  let courseInfo = null;

  if (usedInvite) {
    console.log(`🔗 Used invite code: ${usedInvite.code}`);

    // Check if this invite is mapped to a specific course
    courseInfo = await getMapping(usedInvite.code);

    if (courseInfo) {
      // This is a course-specific invite
      channelName = courseInfo.channelName;
      channelId = courseInfo.channelId;
      console.log(`📺 Course: ${courseInfo.label}`);
      console.log(`📺 Target Channel: ${channelName} (${channelId})`);

      // Check if this is an auto-grant invite (from bulk generator)
      if (courseInfo.autoGrant) {
        console.log(`🔓 Auto-granting access to #${channelName}...`);

        try {
          // Get the target channel
          const targetChannel = member.guild.channels.cache.get(channelId);

          if (targetChannel) {
            // Grant permission to view the channel
            await targetChannel.permissionOverwrites.create(member, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true
            });

            console.log(`✅ Access granted to #${channelName} for ${member.user.tag}`);

            // Send DM to user with channel link
            try {
              const dm = await member.user.createDM();
              await dm.send(
                `🎉 **Welcome to ${member.guild.name}!**\n\n` +
                `You now have access to **#${channelName}**!\n\n` +
                `👉 Click here to go to your channel: <#${channelId}>`
              );
              console.log(`📨 Sent welcome DM to ${member.user.tag}`);
            } catch (dmError) {
              console.error(`❌ Could not DM ${member.user.tag}:`, dmError.message);
            }

            return; // Skip normal onboarding for auto-grant invites
          } else {
            console.error(`❌ Target channel ${channelId} not found!`);
          }
        } catch (permError) {
          console.error(`❌ Failed to grant access:`, permError.message);
        }
      }
    } else if (usedInvite.channel) {
      // Regular invite - use the channel from invite
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

  // NOTE: Automatic DM onboarding is disabled
  // Users should now use the "Click to verify" button in #get-access channel
  console.log(`ℹ️  ${member.user.tag} should go to #get-access and click the verification button`);

  // Start onboarding process via DM - DISABLED
  // try {
  //   await handleOnboarding(member, channelName, channelId, onboardingSessions, client);
  // } catch (error) {
  //   console.error(`❌ Error starting onboarding for ${member.user.tag}:`, error.message);
  // }
});

// Handle slash commands and button interactions
client.on('interactionCreate', async (interaction) => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    // /create-course-invite command
    if (interaction.commandName === 'create-course-invite') {
      const targetChannel = interaction.options.getChannel('channel');
      const sendToString = interaction.options.getString('send-to');
      const label = targetChannel.name; // Use channel name as label

      await interaction.reply({ content: '⏳ Creating course invite...', ephemeral: true });

      try {
        // Make the target channel hidden by default
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          ViewChannel: false,
          SendMessages: false
        });

        // Create an invite from the current channel
        const invite = await interaction.channel.createInvite({
          maxAge: 0, // Never expires
          maxUses: 0, // Unlimited uses
          unique: true
        });

        // Store the mapping
        await addMapping(invite.code, {
          channelId: targetChannel.id,
          channelName: targetChannel.name,
          label: label,
          guildId: interaction.guild.id,
          accessChannelId: interaction.channel.id,
          accessChannelName: interaction.channel.name
        });

        console.log(`✅ Created course invite: ${invite.code} → #${targetChannel.name}`);

        // If users were specified, DM them directly with a button to start verification
        const sentToUsers = [];
        const failedUsers = [];
        if (sendToString) {
          // Extract user IDs from mentions (format: <@123456789>) OR plain user IDs
          const mentionMatches = sendToString.match(/<@!?(\d+)>/g) || [];
          const plainIdMatches = sendToString.match(/\b(\d{17,20})\b/g) || [];

          // Combine and deduplicate user IDs
          const allUserIds = new Set();
          for (const mention of mentionMatches) {
            allUserIds.add(mention.replace(/<@!?(\d+)>/, '$1'));
          }
          for (const id of plainIdMatches) {
            allUserIds.add(id);
          }

          // Also check for usernames (anything that's not a mention or ID)
          // Split by spaces/commas and filter out mentions and IDs
          const parts = sendToString.split(/[\s,]+/).filter(p => p.trim());
          for (const part of parts) {
            // Skip if it's a mention or numeric ID
            if (part.match(/<@!?\d+>/) || part.match(/^\d{17,20}$/)) continue;

            // Try to find member by username
            const cleanUsername = part.replace(/^@/, '').toLowerCase();
            try {
              const members = await interaction.guild.members.fetch();
              const foundMember = members.find(m =>
                m.user.username.toLowerCase() === cleanUsername ||
                m.user.tag.toLowerCase() === cleanUsername ||
                (m.nickname && m.nickname.toLowerCase() === cleanUsername)
              );
              if (foundMember) {
                allUserIds.add(foundMember.id);
              } else {
                failedUsers.push(part + ' (not found)');
              }
            } catch (err) {
              failedUsers.push(part + ' (error)');
            }
          }

          for (const userId of allUserIds) {
            try {
              const user = await client.users.fetch(userId);

              // Check if user is already a member of this guild
              const member = await interaction.guild.members.fetch(userId).catch(() => null);

              const dm = await user.createDM();

              if (member) {
                // Existing member - start onboarding session directly
                const session = {
                  userId: member.id,
                  username: member.user.tag,
                  guildId: interaction.guild.id,
                  channelName: targetChannel.name,
                  channelId: targetChannel.id,
                  currentStep: 0,
                  data: {},
                  started: true,
                  startedAt: Date.now()
                };

                onboardingSessions.set(member.id, session);

                // Send welcome message
                const welcomeMessage = `**You've been invited to ${targetChannel.name}!** 🎓\n\nWe're excited to have you here! To get started with your course and unlock access to your channel, we need your email address.`;
                await dm.send(welcomeMessage);

                // Send email question
                const { QUESTIONS, QUESTION_ORDER } = require('./utils/onboarding');
                const firstQuestion = QUESTIONS[QUESTION_ORDER[0]];
                await dm.send(`\n${firstQuestion.question}`);

              } else {
                // Not a member yet - send invite link
                await dm.send(
                  `**You've been invited to ${label}!** 🎓\n\n` +
                  `Click the link below to join and get access:\n` +
                  `https://discord.gg/${invite.code}\n\n` +
                  `After joining, you'll need to verify your email to access the course channel.`
                );
              }
              sentToUsers.push(user.tag);
              console.log(`📨 Sent invite to ${user.tag}`);
            } catch (dmError) {
              failedUsers.push(userId);
              console.error(`❌ Failed to DM user ${userId}:`, dmError.message);
            }
          }
        }

        await interaction.followUp({
          content: `✅ **Course invite created!**\n\n` +
            `**Course:** ${label}\n` +
            `**Target Channel:** #${targetChannel.name}\n` +
            `**Invite Link:** https://discord.gg/${invite.code}\n` +
            `**Invite Code:** \`${invite.code}\`\n` +
            `**Expires:** Never ⏳\n` +
            `**Max Uses:** Unlimited ∞\n` +
            (sentToUsers.length > 0 ? `**Sent to:** ${sentToUsers.join(', ')}\n` : '') +
            (failedUsers.length > 0 ? `**Failed to send:** ${failedUsers.join(', ')}\n` : '') +
            `\nShare this link with learners:\n` +
            `• New members → Join server → Get DM for verification\n` +
            `• Existing members → Use \`send-to\` with user IDs or @mentions`,
          ephemeral: true
        });
      } catch (error) {
        console.error('❌ Error creating course invite:', error.message);
        await interaction.followUp({ content: '❌ Failed. Check bot permissions.', ephemeral: true });
      }
      return;
    }

    // /list-course-invites command
    if (interaction.commandName === 'list-course-invites') {
      const mappings = await getMappingsForGuild(interaction.guild.id);
      const entries = Object.entries(mappings);

      if (entries.length === 0) {
        await interaction.reply({ content: 'No course invites found. Use `/create-course-invite` to create one.', ephemeral: true });
        return;
      }

      let message = '**Active Course Invites:**\n\n';
      for (const [code, info] of entries) {
        message += `• **${info.label}**\n`;
        message += `  Channel: #${info.channelName}\n`;
        message += `  Link: https://discord.gg/${code}\n`;
        message += `  Code: \`${code}\`\n\n`;
      }

      await interaction.reply({ content: message, ephemeral: true });
      return;
    }

    // /setup-access-button command
    if (interaction.commandName === 'setup-access-button') {
      const getAccessChannel = interaction.guild.channels.cache.find(ch => ch.name === 'get-access');

      if (!getAccessChannel) {
        await interaction.reply({
          content: '❌ #get-access channel not found! Please create a channel named "get-access" first.',
          ephemeral: true
        });
        return;
      }

      try {
        const button = new ButtonBuilder()
          .setCustomId('verify_course_access')
          .setLabel('Click to verify')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await getAccessChannel.send({
          content: `Hello learner,\n\n` +
            `We're excited to have you here! To get you added to your channel, we need to verify your information.\n\n` +
            `Please click on the button below :point_down:`,
          components: [row]
        });

        await interaction.reply({
          content: `✅ Verification button posted in #get-access!`,
          ephemeral: true
        });

        console.log(`📌 Posted generic verification button in #get-access`);
      } catch (error) {
        console.error('❌ Error posting button:', error.message);
        await interaction.reply({
          content: '❌ Failed to post button. Check bot permissions.',
          ephemeral: true
        });
      }
      return;
    }

  }

  // Handle Modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'verification_modal') {
      // Show "Granting Course Access..." instead of default "thinking" animation
      await interaction.reply({ content: '⏳ **Granting Course Access...**', ephemeral: true });

      const email = interaction.fields.getTextInputValue('email_input').trim().toLowerCase();
      const inviteCode = interaction.fields.getTextInputValue('invite_code_input').trim();
      const member = interaction.member;
      const guild = interaction.guild;

      console.log(`📝 Modal submitted by ${member.user.tag}: email=${email}, inviteCode=${inviteCode}`);

      // Step 1: Verify email
      const emailResult = verifyPaidLearner(email);
      if (!emailResult.isVerified) {
        await interaction.editReply({
          content: `❌ **Email not found**\n\n` +
            `The email **${email}** is not registered with Scaler.\n\n` +
            `Please make sure you're using your Scaler registered email ID.`
        });
        return;
      }

      console.log(`✅ Email verified for ${member.user.tag}: ${email}`);

      // Step 2: Verify invite code
      console.log(`🔍 Looking up invite code: ${inviteCode}`);
      const courseInfo = await getMapping(inviteCode);
      console.log(`📋 Invite code lookup result:`, courseInfo ? courseInfo.channelName : 'NOT FOUND');

      if (!courseInfo) {
        console.log(`❌ Invalid invite code: ${inviteCode}`);
        await interaction.editReply({
          content: `❌ **Invalid invite code**\n\n` +
            `**Please enter correct Invite Code:**\n\n` +
            `You might have received the invite code via:\n` +
            `• Email\n` +
            `• Class notice board\n` +
            `• First class topic pre-read section`
        });
        return;
      }

      console.log(`✅ Invite code verified: ${inviteCode} -> ${courseInfo.channelName}`);

      // Step 3: Grant access to the channel
      const targetChannel = guild.channels.cache.get(courseInfo.channelId);
      if (!targetChannel) {
        await interaction.editReply({
          content: `❌ **Channel not found**\n\nThe course channel no longer exists. Please contact support.`
        });
        return;
      }

      try {
        // Grant view and send permissions to the user
        await targetChannel.permissionOverwrites.edit(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });

        console.log(`✅ Access granted to ${member.user.tag} for channel #${targetChannel.name}`);

        // Save learner data to Google Sheet
        try {
          await appendToSheet({
            email: email,
            discordUsername: member.user.tag,
            channel: targetChannel.name
          });
          console.log(`📊 Learner data saved to Google Sheet`);
        } catch (sheetError) {
          console.error(`⚠️ Failed to save to sheet (access still granted):`, sheetError.message);
        }

        // Create button to view the channel
        const viewChannelButton = new ButtonBuilder()
          .setLabel('View Course Channel')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${targetChannel.id}`);

        const row = new ActionRowBuilder().addComponents(viewChannelButton);

        await interaction.editReply({
          content: `:white_check_mark: **All set! Your information has been saved successfully.**\n\n` +
            `**Welcome aboard!** :tada:\n\n` +
            `**Click the button below to access your course channel**`,
          components: [row]
        });

      } catch (error) {
        console.error(`❌ Failed to grant access:`, error.message);
        await interaction.editReply({
          content: `❌ **Failed to grant access**\n\nPlease contact support for assistance.`
        });
      }
      return;
    }
  }

  // Handle button interactions
  if (!interaction.isButton()) return;

  console.log(`🔘 Button clicked: ${interaction.customId} by ${interaction.user.tag}`);

  // Handle generic "Verify Course Access" button - Show Modal
  if (interaction.customId === 'verify_course_access') {
    console.log(`🔘 ${interaction.user.tag} clicked Verify Course Access button`);

    // Create the modal
    const modal = new ModalBuilder()
      .setCustomId('verification_modal')
      .setTitle('Verify Your Access');

    // Email input
    const emailInput = new TextInputBuilder()
      .setCustomId('email_input')
      .setLabel('Your Scaler registered email ID')
      .setPlaceholder('example@gmail.com')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Invite code input
    const inviteCodeInput = new TextInputBuilder()
      .setCustomId('invite_code_input')
      .setLabel('Your invite code (eg: rTAnQCeWAe)')
      .setPlaceholder('Enter the invite code from your email/class')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Add inputs to action rows (each input needs its own row)
    const emailRow = new ActionRowBuilder().addComponents(emailInput);
    const inviteCodeRow = new ActionRowBuilder().addComponents(inviteCodeInput);

    modal.addComponents(emailRow, inviteCodeRow);

    // Show the modal - silently ignore errors (e.g., if user clicks too fast)
    try {
      await interaction.showModal(modal);
      console.log(`✅ Modal shown to ${interaction.user.tag}`);
    } catch (error) {
      // Silently ignore - user can click again
      console.log(`⚠️ Modal not shown (user may have clicked too fast): ${error.message}`);
    }
    return;
  }

  // Handle "Get Access" button click (existing members in get-access channel)
  if (interaction.customId.startsWith('get_access_')) {
    const channelId = interaction.customId.replace('get_access_', '');
    const member = interaction.member;
    const guild = interaction.guild;
    const targetChannel = guild.channels.cache.get(channelId);

    if (!targetChannel) {
      await interaction.reply({ content: '❌ Channel not found.', ephemeral: true });
      return;
    }

    // Check if user already has access
    const permissions = targetChannel.permissionsFor(member);
    if (permissions && permissions.has('ViewChannel')) {
      await interaction.reply({
        content: `You already have access to #${targetChannel.name}! Click here: <#${channelId}>`,
        ephemeral: true
      });
      return;
    }

    // Start verification session
    const session = {
      userId: member.id,
      username: member.user.tag,
      guildId: guild.id,
      channelName: targetChannel.name,
      channelId: channelId,
      currentStep: 0,
      data: {},
      started: true,
      startedAt: Date.now()
    };

    onboardingSessions.set(member.id, session);

    console.log(`\n🔘 ${member.user.tag} clicked Get Access button for #${targetChannel.name}`);

    await interaction.reply({
      content: `📧 Check your DMs! I've sent you a verification message.`,
      ephemeral: true
    });

    // Send DM
    try {
      const dm = await member.user.createDM();
      await dm.send(`**Course Access Request** 🎓\n\nYou've requested access to **#${targetChannel.name}**.\n\nPlease enter your registered email address:`);
    } catch (error) {
      console.error(`❌ Failed to DM ${member.user.tag}:`, error.message);
      await interaction.followUp({
        content: '❌ Could not send you a DM. Please enable DMs from server members.',
        ephemeral: true
      });
      onboardingSessions.delete(member.id);
    }
    return;
  }

  // Handle course access button (from DM after using course invite)
  if (interaction.customId.startsWith('course_access_')) {
    const channelId = interaction.customId.replace('course_access_', '');

    // Get the guild from the stored session
    const session = onboardingSessions.get(interaction.user.id);
    if (!session) {
      await interaction.reply({ content: '❌ Session expired. Please use the invite link again.', ephemeral: true });
      return;
    }

    const guild = client.guilds.cache.get(session.guildId);
    const channel = guild?.channels.cache.get(channelId);

    if (!channel) {
      await interaction.reply({ content: '❌ Channel not found.', ephemeral: true });
      return;
    }

    console.log(`\n🎓 ${interaction.user.tag} clicked course access button for #${channel.name}`);
    await interaction.reply({ content: '✅ Processing...', ephemeral: true });

    // Update session with course info and mark as started
    session.channelId = channelId;
    session.channelName = channel.name;
    session.started = true;

    // Send the email question
    const { QUESTIONS, QUESTION_ORDER } = require('./utils/onboarding');
    const firstQuestion = QUESTIONS[QUESTION_ORDER[0]];
    await interaction.user.send(`\n${firstQuestion.question}`).catch((error) => {
      console.error(`❌ Failed to send question:`, error.message);
    });
    return;
  }

  // Handle DM verify button (sent to existing members via /create-course-invite send-to)
  if (interaction.customId.startsWith('dm_verify_')) {
    const parts = interaction.customId.replace('dm_verify_', '').split('_');
    const guildId = parts[0];
    const channelId = parts[1];

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      await interaction.reply({ content: '❌ Server not found.', ephemeral: true });
      return;
    }

    const targetChannel = guild.channels.cache.get(channelId);
    if (!targetChannel) {
      await interaction.reply({ content: '❌ Channel not found.', ephemeral: true });
      return;
    }

    // Check if user is a member of the guild
    const member = await guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: '❌ You are not a member of this server.', ephemeral: true });
      return;
    }

    // Check if user already has access
    const permissions = targetChannel.permissionsFor(member);
    if (permissions && permissions.has('ViewChannel')) {
      await interaction.reply({
        content: `You already have access to #${targetChannel.name}!`,
        ephemeral: true
      });
      return;
    }

    // Start verification session
    const session = {
      userId: member.id,
      username: member.user.tag,
      guildId: guild.id,
      channelName: targetChannel.name,
      channelId: channelId,
      currentStep: 0,
      data: {},
      started: true,
      startedAt: Date.now()
    };

    onboardingSessions.set(member.id, session);

    console.log(`\n📩 ${member.user.tag} clicked DM verify button for #${targetChannel.name}`);

    await interaction.reply({
      content: `**Course Access Request** 🎓\n\nYou've requested access to **#${targetChannel.name}**.\n\nPlease enter your registered email address:`,
      ephemeral: true
    });

    return;
  }

  // Handle Retry button
  if (interaction.customId === 'retry_onboarding') {
    const session = onboardingSessions.get(interaction.user.id);

    if (!session) {
      await interaction.reply({
        content: '❌ No active onboarding session found. Please contact an administrator.',
        ephemeral: true
      });
      return;
    }

    // Acknowledge the button click
    await interaction.reply({
      content: '✅ Let\'s try again!',
      ephemeral: true
    });

    const { QUESTIONS, QUESTION_ORDER } = require('./utils/onboarding');
    const firstQuestion = QUESTIONS[QUESTION_ORDER[0]];

    // Send the email question again
    await interaction.user.send(`\n${firstQuestion.question}`).catch((error) => {
      console.error(`❌ Failed to send retry question:`, error.message);
    });

    console.log(`🔄 User ${interaction.user.tag} is retrying onboarding`);
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

  // Handle invite code collection (after email verification)
  if (session.waitingForInviteCode) {
    const inviteCode = message.content.trim();

    // Check if this is a valid invite code
    const courseInfo = await getMapping(inviteCode);

    if (!courseInfo) {
      await message.channel.send(
        `❌ **Invalid invite code**\n\n` +
        `**Please enter correct Invite Code:**\n\n` +
        `You might have received the invite code via:\n` +
        `• Email\n` +
        `• Class notice board\n` +
        `• First class topic pre-read section`
      );
      return;
    }

    // Valid invite code - update session and finalize
    session.channelName = courseInfo.channelName;
    session.channelId = courseInfo.channelId;
    session.waitingForInviteCode = false;

    console.log(`✅ ${message.author.tag} provided valid invite code: ${inviteCode} → #${courseInfo.channelName}`);

    await message.channel.send(`**Channel Found: ${courseInfo.channelName}**\n\n⏳ Granting access...`);

    // Now finalize the onboarding
    const { finalizeOnboarding } = require('./utils/onboarding');
    try {
      await finalizeOnboarding(message, session, onboardingSessions, client);
    } catch (error) {
      console.error(`❌ Error finalizing after invite code:`, error.message);
      await message.channel.send('⚠️ An error occurred. Please contact an administrator.').catch(() => {});
    }
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
