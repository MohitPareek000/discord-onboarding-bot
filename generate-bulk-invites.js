/**
 * Bulk Invite Generator
 *
 * Generates unique Discord invite links from a CSV file containing email and channel pairs.
 *
 * USAGE:
 *   node generate-bulk-invites.js <input.csv>
 *
 * INPUT CSV FORMAT (email,channel):
 *   email,channel
 *   user1@example.com,course-1
 *   user1@example.com,course-2
 *   user2@example.com,general
 *
 * OUTPUT (invites_output_<timestamp>.csv):
 *   email,channel,invite_link,invite_code
 *   user1@example.com,course-1,https://discord.gg/abc123,abc123
 *   user1@example.com,course-2,https://discord.gg/def456,def456
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { addMapping } = require('./utils/inviteManager');

// Store for invite mappings (email -> channel -> invite)
const emailInviteMappings = {};

/**
 * Parse CSV file and extract email-channel pairs
 */
function parseCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one data row');
  }

  const pairs = [];
  const header = lines[0].toLowerCase().trim();

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV columns
    const columns = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));

    if (columns.length >= 2) {
      const email = columns[0].toLowerCase().trim();
      const channel = columns[1].toLowerCase().trim();

      if (email && channel && email.includes('@')) {
        pairs.push({ email, channel });
      }
    }
  }

  return pairs;
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
 * Save mappings to JSON for the bot to use
 */
function saveEmailMappings(mappings) {
  const mappingFile = path.join(__dirname, 'emailInviteMappings.json');

  // Load existing mappings
  let existing = {};
  if (fs.existsSync(mappingFile)) {
    existing = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
  }

  // Merge new mappings
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

  if (args.length < 1) {
    console.log(`
Usage: node generate-bulk-invites.js <input.csv> [server-name]

Arguments:
  input.csv     - CSV file with email,channel pairs
  server-name   - (Optional) Server name to use (partial match supported)

CSV Format:
  email,channel
  user1@example.com,course-1
  user1@example.com,course-2
  user2@example.com,general

Examples:
  node generate-bulk-invites.js emails.csv
  node generate-bulk-invites.js emails.csv AIML
  node generate-bulk-invites.js emails.csv "SCALER-AIML-LMS"

The script will:
1. Read email-channel pairs from the CSV file
2. Connect to Discord and find the channels
3. Generate a unique one-time invite link for each pair
4. Export results to a CSV file
`);
    process.exit(1);
  }

  const csvPath = args[0];
  const serverFilter = args[1] || null;

  console.log('\n========================================');
  console.log('   BULK INVITE GENERATOR');
  console.log('========================================\n');

  // Parse CSV
  console.log(`Reading from: ${csvPath}`);
  let pairs;
  try {
    pairs = parseCsv(csvPath);
    console.log(`Found ${pairs.length} email-channel pair(s)\n`);
  } catch (error) {
    console.error(`Error reading CSV: ${error.message}`);
    process.exit(1);
  }

  if (pairs.length === 0) {
    console.error('No valid email-channel pairs found in the CSV file.');
    process.exit(1);
  }

  // Get unique channels needed
  const uniqueChannels = [...new Set(pairs.map(p => p.channel))];
  console.log(`Channels needed: ${uniqueChannels.join(', ')}\n`);

  // Initialize Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildInvites,
    ]
  });

  // Wait for client to be ready
  await new Promise((resolve, reject) => {
    client.once('ready', resolve);
    client.once('error', reject);

    console.log('Connecting to Discord...');
    client.login(process.env.DISCORD_TOKEN).catch(reject);
  });

  console.log(`Logged in as: ${client.user.tag}\n`);

  // List available servers
  console.log('Available servers:');
  client.guilds.cache.forEach(g => console.log(`  - ${g.name}`));
  console.log('');

  // Get guild - either by filter or first one
  let guild;
  if (serverFilter) {
    guild = client.guilds.cache.find(g =>
      g.name.toLowerCase().includes(serverFilter.toLowerCase())
    );
    if (!guild) {
      console.error(`Server matching "${serverFilter}" not found!`);
      client.destroy();
      process.exit(1);
    }
  } else {
    guild = client.guilds.cache.first();
  }

  if (!guild) {
    console.error('Bot is not in any guild! Please add the bot to a server first.');
    client.destroy();
    process.exit(1);
  }

  console.log(`Using server: ${guild.name}\n`);

  // Find channels
  const channelMap = {};
  const notFoundChannels = [];

  for (const channelName of uniqueChannels) {
    const channel = guild.channels.cache.find(
      ch => ch.name.toLowerCase() === channelName && ch.isTextBased()
    );
    if (channel) {
      channelMap[channelName] = channel;
    } else {
      notFoundChannels.push(channelName);
    }
  }

  if (notFoundChannels.length > 0) {
    console.log(`WARNING: Channels not found: ${notFoundChannels.join(', ')}`);
    console.log('Available text channels:');
    guild.channels.cache
      .filter(ch => ch.isTextBased())
      .forEach(ch => console.log(`  - ${ch.name}`));
    console.log('');
  }

  if (Object.keys(channelMap).length === 0) {
    console.error('No valid channels found!');
    client.destroy();
    process.exit(1);
  }

  console.log(`Found ${Object.keys(channelMap).length} channel(s)\n`);

  // Find get-access channel (public channel to create invites from)
  const getAccessChannel = guild.channels.cache.find(
    ch => ch.name.toLowerCase() === 'get-access' && ch.isTextBased()
  );

  if (!getAccessChannel) {
    console.error('ERROR: #get-access channel not found! Please create a public channel named "get-access".');
    client.destroy();
    process.exit(1);
  }

  console.log(`Creating invites from: #${getAccessChannel.name} (public channel)`);
  console.log('Generating invites...\n');

  // Generate invites
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const { email, channel: channelName } of pairs) {
    // Skip if target channel not found
    const targetChannel = channelMap[channelName];
    if (!targetChannel) {
      skipped++;
      continue;
    }

    // Initialize email entry if needed
    if (!emailInviteMappings[email]) {
      emailInviteMappings[email] = {};
    }

    try {
      // Create invite from get-access channel (public), but map to target channel
      const invite = await getAccessChannel.createInvite({
        maxAge: 0,       // Never expires (unlimited time)
        maxUses: 1,      // One-time use only
        unique: true,    // Force unique code
        reason: `Bulk invite for ${email} -> #${targetChannel.name}`
      });

      // Save mapping so bot knows to grant access to target channel when this invite is used
      addMapping(invite.code, {
        channelId: targetChannel.id,
        channelName: targetChannel.name,
        label: targetChannel.name,
        guildId: guild.id,
        accessChannelId: getAccessChannel.id,
        accessChannelName: getAccessChannel.name,
        email: email,  // Store email for verification
        autoGrant: true  // Flag to auto-grant access without verification
      });

      emailInviteMappings[email][targetChannel.name] = {
        inviteLink: `https://discord.gg/${invite.code}`,
        inviteCode: invite.code,
        channelId: targetChannel.id,
        channelName: targetChannel.name,
        createdAt: new Date().toISOString()
      };

      generated++;
      process.stdout.write(`\rProgress: ${generated}/${pairs.length - skipped} invites generated`);
    } catch (error) {
      console.error(`\nFailed to create invite for ${email} -> ${channelName}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n');

  // Export to CSV
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = path.join(__dirname, `invites_output_${timestamp}.csv`);

  exportToCsv(emailInviteMappings, outputPath);
  console.log(`CSV exported to: ${outputPath}`);

  // Save JSON mappings for the bot
  const jsonPath = saveEmailMappings(emailInviteMappings);
  console.log(`JSON mappings saved to: ${jsonPath}`);

  // Summary
  console.log('\n========================================');
  console.log('   SUMMARY');
  console.log('========================================');
  console.log(`Total pairs in CSV: ${pairs.length}`);
  console.log(`Invites generated: ${generated}`);
  console.log(`Skipped (channel not found): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Output file: ${outputPath}`);
  console.log('========================================\n');

  // Disconnect
  client.destroy();
  console.log('Done! Disconnected from Discord.\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
