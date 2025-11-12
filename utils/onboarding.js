/**
 * Onboarding Handler Module
 *
 * Manages the user onboarding flow via DM
 */

const { appendToSheet } = require('./sheets');
const { isValidEmail, isValidPhone, isValidName, sanitizeInput } = require('./validators');
const { verifyPaidLearner } = require('./emailVerification');

// Onboarding questions
const QUESTIONS = {
  NAME: {
    key: 'name',
    question: 'Please enter your **full name**:',
    validator: isValidName,
    errorMessage: '❌ Please enter a valid name (at least 2 characters).'
  },
  EMAIL: {
    key: 'email',
    question: 'Great! Now, please enter your **email address**:',
    validator: isValidEmail,
    errorMessage: '❌ Please enter a valid email address (e.g., user@example.com).'
  },
  PHONE: {
    key: 'phone',
    question: 'Almost done! Please enter your **phone number**:',
    validator: isValidPhone,
    errorMessage: '❌ Please enter a valid phone number (10-15 digits).'
  }
};

const QUESTION_ORDER = ['NAME', 'EMAIL', 'PHONE'];

/**
 * Start the onboarding process for a new member
 *
 * @param {GuildMember} member - The new guild member
 * @param {string} channelName - The channel/course they joined from
 * @param {string} channelId - The channel ID to grant access to
 * @param {Collection} sessions - Active onboarding sessions
 * @param {Client} client - Discord client
 */
async function handleOnboarding(member, channelName, channelId, sessions, client) {
  try {
    // Check if DMs are open
    const dm = await member.user.createDM().catch(() => null);
    if (!dm) {
      console.error(`❌ Could not create DM with ${member.user.tag} - DMs may be disabled`);
      return;
    }

    // Initialize session
    const session = {
      userId: member.id,
      username: member.user.tag, // Store Discord username (e.g., "username#1234")
      guildId: member.guild.id,
      channelName: channelName,
      channelId: channelId,
      currentStep: 0,
      data: {},
      started: false, // Will be set to true when user clicks Start button
      startedAt: Date.now()
    };

    sessions.set(member.id, session);
    console.log(`📝 Started onboarding session for ${member.user.tag}`);

    // Send welcome message with Start button
    const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

    const welcomeMessage = `**Welcome to your learning journey!** 🎓\n\nWe're excited to have you here! To get started with your course and unlock access to your channel, we need to collect a few quick details.\n\n**Here's what we'll need:**\n**Step 1:** Your full name\n**Step 2:** Your email address\n**Step 3:** Your phone number\n\nReady? Click the button below to begin!`;

    const startButton = new ButtonBuilder()
      .setCustomId('start_onboarding')
      .setLabel('Start Onboarding')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(startButton);

    await dm.send({
      content: welcomeMessage,
      components: [row]
    }).catch((error) => {
      console.error(`❌ Failed to send welcome message:`, error.message);
      sessions.delete(member.id);
    });
  } catch (error) {
    console.error(`❌ Error in handleOnboarding:`, error.message);
    throw error;
  }
}

/**
 * Handle user responses during onboarding
 *
 * @param {Message} message - User's DM message
 * @param {Object} session - Current onboarding session
 * @param {Collection} sessions - Active onboarding sessions
 * @param {Client} client - Discord client
 */
async function handleResponse(message, session, sessions, client) {
  const currentQuestionKey = QUESTION_ORDER[session.currentStep];
  const currentQuestion = QUESTIONS[currentQuestionKey];

  // Sanitize and validate input
  const userInput = sanitizeInput(message.content);

  if (!currentQuestion.validator(userInput)) {
    await message.channel.send(currentQuestion.errorMessage);
    return;
  }

  // Store the validated data
  session.data[currentQuestion.key] = userInput;
  console.log(`   ✓ ${currentQuestion.key}: ${userInput}`);

  // Move to next step
  session.currentStep++;

  // Check if there are more questions
  if (session.currentStep < QUESTION_ORDER.length) {
    const nextQuestionKey = QUESTION_ORDER[session.currentStep];
    const nextQuestion = QUESTIONS[nextQuestionKey];
    await message.channel.send(nextQuestion.question);
  } else {
    // All questions answered - finalize onboarding
    await finalizeOnboarding(message, session, sessions, client);
  }
}

/**
 * Finalize the onboarding process
 *
 * @param {Message} message - User's last message
 * @param {Object} session - Completed onboarding session
 * @param {Collection} sessions - Active onboarding sessions
 * @param {Client} client - Discord client
 */
async function finalizeOnboarding(message, session, sessions, client) {
  try {
    await message.channel.send('⏳ Processing your information...');

    // Verify if the user is a paid learner
    console.log(`🔍 Verifying email: ${session.data.email}...`);
    const verificationResult = verifyPaidLearner(session.data.email);

    if (!verificationResult.isVerified) {
      // User is not a paid learner - deny access
      console.log(`❌ Access denied for ${session.userId} - not a paid learner`);

      await message.channel.send(
        `Hi there! 👋\n\nThe email ID or phone number you entered doesn't match our Scaler records.\n\nPlease double-check and share your registered details with me again.\n\nIf you're still having trouble, please contact our support team through your dashboard for a quick fix! Guide: https://shorturl.at/hbuuM`
      );

      // Clean up session
      sessions.delete(session.userId);
      return;
    }

    // User is verified - continue with onboarding
    console.log(`✅ Email verified: ${session.data.email} is a paid learner`);
    console.log(`   Name from database: ${verificationResult.learnerData.name}`);
    console.log(`   Program: ${verificationResult.learnerData.program}`);
    console.log(`   Batch: ${verificationResult.learnerData.batch}`);

    // Prepare data for Google Sheets
    const sheetData = {
      name: session.data.name,
      email: session.data.email,
      phone: session.data.phone,
      discordUsername: session.username,
      channel: session.channelName
    };

    console.log(`📊 Saving data to Google Sheets for user ${session.userId}...`);

    // Save to Google Sheets
    await appendToSheet(sheetData);

    // Get the guild and member
    const guild = client.guilds.cache.get(session.guildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    const member = await guild.members.fetch(session.userId);
    if (!member) {
      throw new Error('Member not found');
    }

    // Assign "Learner" role
    const roleName = process.env.LEARNER_ROLE_NAME || 'Learner';
    const role = guild.roles.cache.find(r => r.name === roleName);

    if (role) {
      await member.roles.add(role);
      console.log(`✅ Assigned "${roleName}" role to ${member.user.tag}`);
    } else {
      console.warn(`⚠️  Role "${roleName}" not found in guild ${guild.name}`);
    }

    // Grant access to the original channel if we have a channelId
    if (session.channelId) {
      try {
        const channel = guild.channels.cache.get(session.channelId);
        if (channel) {
          // Create permission overwrite to allow the user to view and send messages
          await channel.permissionOverwrites.create(member.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          });
          console.log(`✅ Granted access to channel #${channel.name} for ${member.user.tag}`);

          // Send a welcome message in the channel to make it prominent
          try {
            await channel.send(`🎉 Welcome to the course, <@${member.id}>! We're excited to have you here. Feel free to introduce yourself and start learning!`);
            console.log(`✅ Sent welcome message in #${channel.name} for ${member.user.tag}`);
          } catch (msgError) {
            console.error(`❌ Failed to send welcome message in channel:`, msgError.message);
          }
        } else {
          console.warn(`⚠️  Channel ${session.channelId} not found in guild`);
        }
      } catch (channelError) {
        console.error(`❌ Failed to grant channel access:`, channelError.message);
        // Don't throw - continue with onboarding even if channel access fails
      }
    }

    // Send confirmation message with button
    const confirmationMessage = `
✅ **All set!** Your information has been saved successfully.

You've been assigned the **${roleName}** role and now have access to your course materials.

Welcome aboard! 🎉
    `.trim();

    // Create button component if we have a channel
    if (session.channelId) {
      const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

      const viewChannelButton = new ButtonBuilder()
        .setLabel('View Course Channel')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${session.guildId}/${session.channelId}`);

      const row = new ActionRowBuilder().addComponents(viewChannelButton);

      await message.channel.send({
        content: confirmationMessage + `\n\nClick the button below to access your course channel:`,
        components: [row]
      });
    } else {
      await message.channel.send(confirmationMessage);
    }

    console.log(`✅ Onboarding completed for ${member.user.tag}`);
    console.log(`   📋 Name: ${session.data.name}`);
    console.log(`   📧 Email: ${session.data.email}`);
    console.log(`   📱 Phone: ${session.data.phone}`);
    console.log(`   👤 Discord Username: ${session.username}`);
    console.log(`   📺 Channel: ${session.channelName}\n`);

    // Clean up session
    sessions.delete(session.userId);
  } catch (error) {
    console.error(`❌ Error finalizing onboarding:`, error.message);

    // Notify user of error
    await message.channel.send(
      '❌ An error occurred while saving your information. Please contact an administrator for assistance.'
    ).catch(() => {});

    // Keep session active for potential retry
    console.error('   Session kept active for potential manual intervention');
  }
}

module.exports = {
  handleOnboarding,
  handleResponse,
  QUESTIONS,
  QUESTION_ORDER
};
