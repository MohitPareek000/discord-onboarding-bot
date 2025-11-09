/**
 * Generate Discord Bot Invite URL
 *
 * Run this script to generate an invite link for your bot
 */

require('dotenv').config();

const CLIENT_ID = '1436626187890983113'; // Your bot client ID

// Required permissions (as integer)
// Manage Roles (268435456) + Manage Channels (16) + View Channels (1024) + Send Messages (2048) + Read Message History (65536) + Manage Server/View Audit Log (8)
const PERMISSIONS = 268512336; // All required permissions combined

const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${PERMISSIONS}&scope=bot`;

console.log('\n🔗 Discord Bot Invite URL:\n');
console.log(inviteUrl);
console.log('\n📋 Instructions:');
console.log('1. Copy the URL above');
console.log('2. Paste it in your browser');
console.log('3. Select your Discord server');
console.log('4. Authorize the bot with the required permissions');
console.log('5. Make sure to enable these Gateway Intents in Discord Developer Portal:');
console.log('   - SERVER MEMBERS INTENT (required!)');
console.log('   - MESSAGE CONTENT INTENT (required!)');
console.log('   - PRESENCE INTENT (optional)');
console.log('\n✅ After adding the bot, it will start onboarding new members!\n');
