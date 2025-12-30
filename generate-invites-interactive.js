/**
 * Interactive Bulk Invite Generator
 *
 * Generates unique Discord invite links for a list of emails.
 * Shows available channels and lets you select which ones to use.
 *
 * USAGE:
 *   node generate-invites-interactive.js <emails.csv>
 *
 * The script will:
 * 1. Connect to Discord
 * 2. Show all available text channels
 * 3. Let you select channels by number
 * 4. Generate unique invites for each email-channel combination
 * 5. Export results to CSV
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

// Store for invite mappings
const emailInviteMappings = {};

/**
 * Create readline interface for user input
 */
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
function prompt(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

/**
 * Parse CSV file and extract emails
 */
function parseEmailsCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one email');
  }

  const emails = [];
  const header = lines[0].toLowerCase().trim();

  // Check if first line is a header
  const hasHeader = header.includes('email') || header.includes('@') === false;
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle CSV with multiple columns
    const columns = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));

    // Find email in columns
    let email = columns.find(col => col.includes('@'));
    if (!email) email = columns[0];

    if (email && email.includes('@')) {
      emails.push(email.toLowerCase().trim());
    }
  }

  return [...new Set(emails)];
}

/**
 * Export results to CSV
 */
function exportToCsv(mappings, outputPath) {
  const lines = ['email,channel,invite_link,invite_code'];

  for (const [email, channels] of Object.entries(mappings)) {
    for (const [channelName, inviteData] of Object.entries(channels)) {
      lines.push(`"${email}","${channelName}","${inviteData.inviteLink}","${inviteData.inviteCode}"`);
    }
  }

  fs.writeFileSync(outputPath, lines.join('\n'));
  return outputPath;
}

/**
 * Save mappings to JSON for the bot
 */
function saveEmailMappings(mappings) {
  const mappingFile = path.join(__dirname, 'emailInviteMappings.json');

  let existing = {};
  if (fs.existsSync(mappingFile)) {
    existing = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
  }

  for (const [email, channels] of Object.entries(mappings)) {
    if (!existing[email]) {
      existing[email] = {};
    }
    Object.assign(existing[email], channels);
  }

  fs.writeFileSync(mappingFile, JSON.stringify(existing, null, 2));
  return mappingFile;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  console.log('\n========================================');
  console.log('   INTERACTIVE BULK INVITE GENERATOR');
  console.log('========================================\n');

  // Check for CSV argument
  if (args.length < 1) {
    console.log('Usage: node generate-invites-interactive.js <emails.csv>\n');
    console.log('Example: node generate-invites-interactive.js sample_emails.csv\n');
    process.exit(1);
  }

  const csvPath = args[0];

  // Parse emails
  console.log(`Reading emails from: ${csvPath}`);
  let emails;
  try {
    emails = parseEmailsCsv(csvPath);
    console.log(`Found ${emails.length} unique email(s):\n`);
    emails.forEach((email, i) => console.log(`  ${i + 1}. ${email}`));
    console.log('');
  } catch (error) {
    console.error(`Error reading CSV: ${error.message}`);
    process.exit(1);
  }

  if (emails.length === 0) {
    console.error('No valid emails found in the CSV file.');
    process.exit(1);
  }

  // Initialize Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildInvites,
    ]
  });

  // Connect to Discord
  await new Promise((resolve, reject) => {
    client.once('ready', resolve);
    client.once('error', reject);

    console.log('Connecting to Discord...');
    client.login(process.env.DISCORD_TOKEN).catch(reject);
  });

  console.log(`Logged in as: ${client.user.tag}\n`);

  // Get guild
  const guilds = [...client.guilds.cache.values()];

  if (guilds.length === 0) {
    console.error('Bot is not in any server!');
    client.destroy();
    process.exit(1);
  }

  const rl = createReadline();

  // Select guild if multiple
  let guild;
  if (guilds.length === 1) {
    guild = guilds[0];
    console.log(`Using server: ${guild.name}\n`);
  } else {
    console.log('Available servers:');
    guilds.forEach((g, i) => console.log(`  ${i + 1}. ${g.name}`));
    console.log('');

    const guildChoice = await prompt(rl, 'Select server number: ');
    const guildIndex = parseInt(guildChoice) - 1;

    if (isNaN(guildIndex) || guildIndex < 0 || guildIndex >= guilds.length) {
      console.error('Invalid selection.');
      rl.close();
      client.destroy();
      process.exit(1);
    }

    guild = guilds[guildIndex];
    console.log(`\nSelected: ${guild.name}\n`);
  }

  // Get text channels (excluding categories and voice)
  const textChannels = guild.channels.cache
    .filter(ch => ch.type === ChannelType.GuildText)
    .sort((a, b) => a.position - b.position);

  if (textChannels.size === 0) {
    console.error('No text channels found in this server!');
    rl.close();
    client.destroy();
    process.exit(1);
  }

  // Display channels
  console.log('Available text channels:');
  console.log('─'.repeat(40));
  const channelArray = [...textChannels.values()];
  channelArray.forEach((ch, i) => {
    const category = ch.parent ? `[${ch.parent.name}]` : '';
    console.log(`  ${String(i + 1).padStart(2)}. #${ch.name} ${category}`);
  });
  console.log('─'.repeat(40));
  console.log('');

  // Get channel selection
  console.log('Enter channel numbers to generate invites for.');
  console.log('You can enter:');
  console.log('  - Single number: 1');
  console.log('  - Multiple numbers: 1,3,5');
  console.log('  - Range: 1-5');
  console.log('  - Combination: 1,3-5,7');
  console.log('  - "all" for all channels');
  console.log('');

  const channelInput = await prompt(rl, 'Select channels: ');

  // Parse channel selection
  const selectedIndices = new Set();

  if (channelInput.toLowerCase() === 'all') {
    channelArray.forEach((_, i) => selectedIndices.add(i));
  } else {
    const parts = channelInput.split(',').map(p => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        // Range
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= channelArray.length) {
              selectedIndices.add(i - 1);
            }
          }
        }
      } else {
        // Single number
        const num = parseInt(part);
        if (!isNaN(num) && num >= 1 && num <= channelArray.length) {
          selectedIndices.add(num - 1);
        }
      }
    }
  }

  if (selectedIndices.size === 0) {
    console.error('\nNo valid channels selected.');
    rl.close();
    client.destroy();
    process.exit(1);
  }

  const selectedChannels = [...selectedIndices].sort((a, b) => a - b).map(i => channelArray[i]);

  console.log(`\nSelected ${selectedChannels.length} channel(s):`);
  selectedChannels.forEach(ch => console.log(`  - #${ch.name}`));
  console.log('');

  const totalInvites = emails.length * selectedChannels.length;
  console.log(`Total invites to generate: ${totalInvites}`);

  const confirm = await prompt(rl, '\nProceed? (y/n): ');
  rl.close();

  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('\nCancelled.');
    client.destroy();
    process.exit(0);
  }

  console.log('\nGenerating invites...\n');

  // Generate invites
  let generated = 0;
  let failed = 0;

  for (const email of emails) {
    emailInviteMappings[email] = {};

    for (const channel of selectedChannels) {
      try {
        // One-time use, never expires
        const invite = await channel.createInvite({
          maxAge: 0,       // Never expires (unlimited time)
          maxUses: 1,      // One-time use only
          unique: true,    // Force unique code
          reason: `Bulk invite for ${email}`
        });

        emailInviteMappings[email][channel.name] = {
          inviteLink: `https://discord.gg/${invite.code}`,
          inviteCode: invite.code,
          channelId: channel.id,
          channelName: channel.name,
          createdAt: new Date().toISOString()
        };

        generated++;
        process.stdout.write(`\rProgress: ${generated}/${totalInvites} invites generated`);
      } catch (error) {
        console.error(`\nFailed: ${email} -> ${channel.name}: ${error.message}`);
        failed++;
      }
    }
  }

  console.log('\n');

  // Export results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = path.join(__dirname, `invites_output_${timestamp}.csv`);

  exportToCsv(emailInviteMappings, outputPath);
  console.log(`CSV exported to: ${outputPath}`);

  const jsonPath = saveEmailMappings(emailInviteMappings);
  console.log(`JSON mappings saved to: ${jsonPath}`);

  // Summary
  console.log('\n========================================');
  console.log('   SUMMARY');
  console.log('========================================');
  console.log(`Emails: ${emails.length}`);
  console.log(`Channels: ${selectedChannels.length}`);
  console.log(`Invites generated: ${generated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Output: ${outputPath}`);
  console.log('========================================\n');

  client.destroy();
  console.log('Done!\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
