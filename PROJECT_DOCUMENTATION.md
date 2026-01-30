# Discord Onboarding Bot - Complete Project Documentation

## Overview

A Discord bot built for Scaler's learning platform that automates learner verification and course channel access. The bot verifies learners through email and invite codes, then grants access to specific course channels.

**Bot Name:** ScalerNewBot
**Framework:** Discord.js v14
**Storage:** Google Sheets API
**Email Database:** paidLearners.json (can be replaced with Metabase API)

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Complete User Flow](#complete-user-flow)
3. [Project Structure](#project-structure)
4. [Detailed File Explanations](#detailed-file-explanations)
5. [Bot Commands](#bot-commands)
6. [Data Storage](#data-storage)
7. [Complete Setup Guide](#complete-setup-guide)
   - [Discord Bot Setup](#part-1-discord-bot-setup)
   - [Google Cloud & Sheets Setup](#part-2-google-cloud--sheets-setup)
   - [Project Configuration](#part-3-project-configuration)
   - [Running the Bot](#part-4-running-the-bot)
8. [Environment Variables](#environment-variables)
9. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
10. [Maintenance Guide](#maintenance-guide)
11. [Security Notes](#security-notes)
12. [Future Improvements](#future-improvements)

---

## How It Works

### High-Level Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   Discord User    |---->|   Discord Bot     |---->|  Google Sheets    |
|  (Learner)        |     |  (ScalerNewBot)   |     |  (Data Storage)   |
+-------------------+     +-------------------+     +-------------------+
                               |
                               v
                        +-------------------+
                        | paidLearners.json |
                        | (Email Database)  |
                        +-------------------+
```

### Verification Process

1. **Email Verification**: Checks if learner's email exists in `paidLearners.json`
2. **Invite Code Verification**: Looks up invite code in Google Sheets "InviteMappings" tab
3. **Access Grant**: Adds user permissions to view the specific course channel
4. **Data Logging**: Saves verification details (timestamp, email, discord username, channel) to Google Sheets "Sheet1"

### Why Modal Instead of DMs?

Initially, the bot used DMs to collect email and invite code. However, Discord's anti-spam system **quarantined the bot** for sending too many DMs.

**Solution:** Switched to Discord's Modal (popup form) system which:
- No DM limits
- No spam detection triggers
- Faster user experience
- Works even if user has DMs disabled

---

## Complete User Flow

### For Learners (New & Existing Members)

```
+---------------------------------------------------------------------+
|  1. JOINING THE SERVER                                              |
+---------------------------------------------------------------------+
|  - User receives Discord invite link (shared via email/class)       |
|  - User clicks link and joins the server                            |
|  - User lands in server but can only see #get-access channel        |
+---------------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------------+
|  2. VERIFICATION PROCESS                                            |
+---------------------------------------------------------------------+
|  - User goes to #get-access channel                                 |
|  - Sees message: "Hello learner, We're excited to have you..."      |
|  - Clicks "Click to verify" button                                  |
+---------------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------------+
|  3. MODAL POPUP                                                     |
+---------------------------------------------------------------------+
|  - Modal title: "Verify Your Access"                                |
|  - Field 1: "Your Scaler registered email ID"                       |
|  - Field 2: "Your invite code (eg: rTAnQCeWAe)"                     |
|  - User fills both fields and clicks Submit                         |
+---------------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------------+
|  4. VERIFICATION (Behind the scenes)                                |
+---------------------------------------------------------------------+
|  - Bot shows: "Granting Course Access..."                           |
|  - Step 1: Check email in paidLearners.json                         |
|  - Step 2: Look up invite code in Google Sheets                     |
|  - Step 3: Find target channel from mapping                         |
|  - Step 4: Grant ViewChannel permission to user                     |
|  - Step 5: Save data to Google Sheets                               |
+---------------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------------+
|  5. SUCCESS                                                         |
+---------------------------------------------------------------------+
|  - Message: "All set! Your information has been saved..."           |
|  - Button: "View Course Channel" (links to their channel)           |
|  - User can now see and access their course channel                 |
+---------------------------------------------------------------------+
```

### For Admins (Creating Course Invites)

```
+---------------------------------------------------------------------+
|  1. CREATE COURSE CHANNEL                                           |
+---------------------------------------------------------------------+
|  - Create a new channel in Discord (e.g., #aiml-oct25-batch)        |
|  - This channel will be hidden by default after invite creation     |
+---------------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------------+
|  2. RUN COMMAND                                                     |
+---------------------------------------------------------------------+
|  - Go to any channel where bot has access                           |
|  - Type: /create-course-invite channel:#aiml-oct25-batch            |
|  - Bot creates invite and stores mapping in Google Sheets           |
+---------------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------------+
|  3. SHARE INVITE CODE                                               |
+---------------------------------------------------------------------+
|  - Bot responds with invite code (e.g., T38VGH9ysZ)                 |
|  - Share this code with learners via:                               |
|    - Email                                                          |
|    - Class notice board                                             |
|    - First class topic pre-read section                             |
+---------------------------------------------------------------------+
```

---

## Project Structure

```
discord-onboarding-bot/
|
|-- index.js                      # MAIN FILE - All bot logic
|-- setup-commands.js             # Registers slash commands with Discord
|-- package.json                  # Node.js dependencies
|-- package-lock.json             # Dependency lock file
|
|-- .env                          # SECRETS - Environment variables
|-- credentials.json              # SECRETS - Google Service Account key
|-- paidLearners.json             # Email database (76MB)
|
|-- utils/
|   |-- sheets.js                 # Google Sheets API functions
|   |-- inviteManager.js          # Invite code -> Channel mapping
|   |-- emailVerification.js      # Email verification against JSON
|   |-- onboarding.js             # Legacy DM onboarding (not used now)
|
|-- PROJECT_DOCUMENTATION.md      # This file
|-- GOOGLE_SHEETS_MIGRATION.md    # Migration docs
|-- README.md                     # Basic readme
|-- ... other docs
```

---

## Detailed File Explanations

### 1. index.js (Main Bot File)

**Location:** `/index.js`
**Purpose:** Core bot logic - handles ALL Discord interactions

**What it does:**
- Initializes Discord client with required intents
- Handles slash commands (`/create-course-invite`, `/list-course-invites`, `/setup-access-button`)
- Handles button clicks ("Click to verify")
- Shows modal popup for verification
- Processes modal submission (email + invite code)
- Grants channel permissions
- Saves data to Google Sheets

**Key Code Sections:**

```javascript
// Line 19: Discord.js imports
const { Client, GatewayIntentBits, Partials, Collection, ButtonBuilder,
        ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder,
        TextInputStyle } = require('discord.js');

// Line 33-42: Client initialization with intents
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

// Line ~450: Modal submission handler
if (interaction.isModalSubmit()) {
  // Verify email -> Verify invite code -> Grant access -> Save to sheet
}

// Line ~555: Button click handler - shows modal
if (interaction.customId === 'verify_course_access') {
  // Create and show modal
}
```

### 2. utils/sheets.js (Google Sheets Integration)

**Location:** `/utils/sheets.js`
**Purpose:** All Google Sheets API operations

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `initializeSheetsClient()` | Initialize Google API connection |
| `appendToSheet(data)` | Save learner verification data |
| `saveInviteMapping(inviteCode, courseInfo)` | Store invite -> channel mapping |
| `getInviteMapping(inviteCode)` | Look up channel by invite code |
| `getInviteMappingsForGuild(guildId)` | List all mappings for a server |
| `initializeInviteMappingsSheet()` | Create InviteMappings tab if missing |

**How it connects to Google:**
```javascript
// Supports two methods:

// Method 1: Local development (credentials.json file)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// Method 2: Production/Railway (JSON string in env var)
if (process.env.GOOGLE_CREDENTIALS) {
  auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}
```

### 3. utils/emailVerification.js

**Location:** `/utils/emailVerification.js`
**Purpose:** Verify if email exists in paidLearners.json

**Key Function:**
```javascript
function verifyPaidLearner(email) {
  // 1. Read paidLearners.json
  // 2. Search for email (case-insensitive)
  // 3. Return { isVerified: true/false, learnerData: {...}, reason: null }
}
```

**Returns:**
- `isVerified: true` + `learnerData` object if found
- `isVerified: false` + `reason: 'email_not_found'` if not found
- `isVerified: false` + `reason: 'database_error'` if file error

### 4. utils/inviteManager.js

**Location:** `/utils/inviteManager.js`
**Purpose:** Wrapper for invite code management (uses sheets.js internally)

**Functions:**
```javascript
async function addMapping(inviteCode, courseInfo)    // Save new mapping
async function getMapping(inviteCode)                 // Get channel by code
async function getMappingsForGuild(guildId)          // List all for guild
```

### 5. paidLearners.json

**Location:** `/paidLearners.json`
**Size:** ~76MB
**Purpose:** Database of all registered Scaler learners

**Structure:**
```json
[
  {
    "email": "learner@gmail.com",      // REQUIRED - used for verification
    "name": "Learner Name",            // Optional
    "program": "AIML",                 // Optional
    "batch": "AIML Apr25 Batch",       // Optional
    "phone": "+91-9876543210",         // Optional
    ... other fields
  },
  ...
]
```

**Important:** Only the `email` field is actually used for verification. All other fields are optional.

---

## Bot Commands

### 1. /create-course-invite

**Purpose:** Create a new invite code for a course channel

**Usage:**
```
/create-course-invite channel:#channel-name
```

**What it does:**
1. Makes the target channel **hidden** (removes @everyone view permission)
2. Creates a Discord invite link (never expires, unlimited uses)
3. Stores mapping in Google Sheets: `inviteCode -> channelId`
4. Returns the invite code to share with learners

**Example Response:**
```
Course invite created!

Course: aiml-oct25-batch
Invite Code: T38VGH9ysZ
Expires: Never
Max Uses: Unlimited

Share this invite code with your learners. They'll use it during verification.
```

### 2. /list-course-invites

**Purpose:** List all invite codes for the current server

**Usage:**
```
/list-course-invites
```

**Example Response:**
```
Course Invites for this server:

1. T38VGH9ysZ -> #aiml-oct25-batch
2. hbKeyaFnyy -> #aiml-nov25-batch
3. 6tFjGRYwYD -> #academy-hld-19-nov-25

Total: 3 invite codes
```

### 3. /setup-access-button

**Purpose:** Post the verification button in #get-access channel

**Usage:**
```
/setup-access-button
```

**What it does:**
1. Finds #get-access channel in the server
2. Posts message with "Click to verify" button
3. This is the entry point for all learner verifications

**Message Posted:**
```
Hello learner,

We're excited to have you here! To get you added to your channel,
we need to verify your information.

Please click on the button below

[Click to verify]  <- Button
```

---

## Data Storage

### Google Sheets Structure

Your Google Sheet should have **2 tabs**:

#### Tab 1: "Sheet1" (Learner Verifications Log)

| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| Timestamp | Email | Discord Username | Channel |
| 29/01/2026, 17:30:00 | user@gmail.com | username#1234 | aiml-oct25-batch |
| 29/01/2026, 17:35:00 | another@gmail.com | user#5678 | dsml-nov25-batch |

**Headers (Row 1):**
```
Timestamp | Email | Discord Username | Channel
```

#### Tab 2: "InviteMappings" (Invite Code -> Channel Mapping)

| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H |
|----------|----------|----------|----------|----------|----------|----------|----------|
| InviteCode | ChannelId | ChannelName | Label | GuildId | AccessChannelId | AccessChannelName | Timestamp |
| T38VGH9ysZ | 123456789 | aiml-oct25-batch | aiml-oct25-batch | 987654321 | | | 2026-01-29T12:00:00Z |

**Headers (Row 1):**
```
InviteCode | ChannelId | ChannelName | Label | GuildId | AccessChannelId | AccessChannelName | Timestamp
```

**Note:** The "InviteMappings" tab is auto-created by the bot if it doesn't exist.

---

## Complete Setup Guide

### Part 1: Discord Bot Setup

#### Step 1.1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter name: `ScalerBot` (or your preferred name)
4. Click **"Create"**

#### Step 1.2: Create Bot User

1. In your application, go to **"Bot"** section (left sidebar)
2. Click **"Add Bot"**
3. Click **"Yes, do it!"**
4. Under **"Token"**, click **"Reset Token"**
5. **Copy the token** - you'll need this for `.env` file

   **WARNING: NEVER share this token publicly!**

#### Step 1.3: Enable Privileged Intents

Still in the Bot section, scroll down to **"Privileged Gateway Intents"**:

1. Enable **"SERVER MEMBERS INTENT"**
2. Enable **"MESSAGE CONTENT INTENT"**
3. Click **"Save Changes"**

#### Step 1.4: Set Bot Permissions

1. Go to **"OAuth2"** -> **"URL Generator"**
2. Under **"Scopes"**, check:
   - `bot`
   - `applications.commands`
3. Under **"Bot Permissions"**, check:
   - `Manage Channels`
   - `Manage Roles`
   - `Send Messages`
   - `Create Instant Invite`
   - `Embed Links`
   - `Read Message History`
   - `Use Slash Commands`
4. Copy the generated URL at the bottom
5. Open URL in browser to invite bot to your server

---

### Part 2: Google Cloud & Sheets Setup

#### Step 2.1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** -> **"New Project"**
3. Enter name: `discord-onboarding-bot`
4. Click **"Create"**
5. Wait for project to be created, then select it

#### Step 2.2: Enable Google Sheets API

1. In Google Cloud Console, go to **"APIs & Services"** -> **"Library"**
2. Search for **"Google Sheets API"**
3. Click on it, then click **"Enable"**

#### Step 2.3: Create Service Account

1. Go to **"APIs & Services"** -> **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** -> **"Service account"**
3. Enter details:
   - Service account name: `discord-bot`
   - Service account ID: `discord-bot` (auto-filled)
   - Description: `Service account for Discord onboarding bot`
4. Click **"Create and Continue"**
5. Skip the optional steps, click **"Done"**

#### Step 2.4: Generate Credentials JSON

1. In Credentials page, find your service account
2. Click on the service account email
3. Go to **"Keys"** tab
4. Click **"Add Key"** -> **"Create new key"**
5. Select **"JSON"**
6. Click **"Create"**
7. **Download the JSON file** - save it as `credentials.json`

The file looks like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "discord-bot@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

**Important:** Note the `client_email` - you'll need this for the next step!

#### Step 2.5: Create Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a **new blank spreadsheet**
3. Name it: `Discord Onboarding Data`
4. Note the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
   Copy the part between `/d/` and `/edit`

#### Step 2.6: Share Spreadsheet with Service Account

**This is the most commonly missed step!**

1. In your Google Sheet, click **"Share"** button (top right)
2. Paste the service account email from Step 2.4:
   ```
   discord-bot@your-project.iam.gserviceaccount.com
   ```
3. Set permission to **"Editor"**
4. Uncheck "Notify people"
5. Click **"Share"**

Without this step, the bot cannot read/write to the sheet!

#### Step 2.7: Create Sheet Headers (Optional)

In your spreadsheet:

**Tab "Sheet1"** - Add headers in row 1:
```
Timestamp | Email | Discord Username | Channel
```

**Tab "InviteMappings"** - Will be auto-created by bot, or you can create:
```
InviteCode | ChannelId | ChannelName | Label | GuildId | AccessChannelId | AccessChannelName | Timestamp
```

---

### Part 3: Project Configuration

#### Step 3.1: Clone Repository

```bash
git clone https://github.com/MohitPareek000/discord-onboarding-bot.git
cd discord-onboarding-bot
```

#### Step 3.2: Install Dependencies

```bash
npm install
```

#### Step 3.3: Add Credentials File

Copy your `credentials.json` (from Step 2.4) to the project root:
```
discord-onboarding-bot/
|-- credentials.json    <- Put it here
|-- index.js
|-- ...
```

#### Step 3.4: Create .env File

Create a file named `.env` in the project root:

```env
# Discord Bot Token (from Step 1.2)
DISCORD_TOKEN=your_discord_bot_token_here

# Google Spreadsheet ID (from Step 2.5)
SPREADSHEET_ID=your_spreadsheet_id_here

# Path to Google credentials file
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# Optional: Role name to assign to verified learners
LEARNER_ROLE_NAME=Learner
```

**Example `.env`:**
```env
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.XXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXX
SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
LEARNER_ROLE_NAME=Learner
```

#### Step 3.5: Add paidLearners.json

You need a file with all registered learner emails. Format:
```json
[
  {"email": "learner1@gmail.com"},
  {"email": "learner2@outlook.com"},
  ...
]
```

**To get this data:**
- Export from Metabase query
- Export from your learner database
- Minimum requirement: JSON array with `email` field in each object

---

### Part 4: Running the Bot

#### Step 4.1: Register Slash Commands

Run this once (or after adding new commands):
```bash
node setup-commands.js
```

Expected output:
```
Started refreshing application (/) commands.
Successfully reloaded application (/) commands.
```

#### Step 4.2: Start the Bot

```bash
npm start
```

Expected output:
```
Discord Onboarding Bot is online!
Logged in as: ScalerNewBot#9446
Serving 5 server(s)
Cached 118 invites for guild: SCALER-SDE-LMS
Cached 55 invites for guild: SCALER-DSML-LMS
Bot is ready to onboard new members!
```

#### Step 4.3: Initial Server Setup

In each Discord server:

1. Create a channel named `#get-access` (visible to everyone)
2. Run `/setup-access-button` in any channel
3. Bot will post the verification button in #get-access

#### Step 4.4: Create Course Invites

For each course channel:
```
/create-course-invite channel:#course-channel-name
```

Share the returned invite code with learners.

---

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | Yes | `MTIzNDU2Nzg5...` |
| `SPREADSHEET_ID` | Google Sheets spreadsheet ID | Yes | `1BxiMVs0XRA5nF...` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to credentials.json | Yes (local) | `./credentials.json` |
| `GOOGLE_CREDENTIALS` | JSON string of credentials | Yes (Railway) | `{"type":"service_account",...}` |
| `LEARNER_ROLE_NAME` | Role to assign after verification | No | `Learner` |

### For Railway/Production Deployment

Instead of `GOOGLE_APPLICATION_CREDENTIALS` file, use `GOOGLE_CREDENTIALS` env var:

1. Open your `credentials.json`
2. Minify the JSON (remove whitespace)
3. Set as `GOOGLE_CREDENTIALS` environment variable

---

## Common Issues & Troubleshooting

### "Email not found"

**Cause:** Email doesn't exist in paidLearners.json

**Solutions:**
- User should enter exact registered email
- Check paidLearners.json has the email
- Email comparison is case-insensitive

---

### "Invalid invite code"

**Cause:** Invite code not in Google Sheets InviteMappings

**Solutions:**
- Check InviteMappings tab in Google Sheets
- Admin needs to run `/create-course-invite` first
- User may have typo in invite code

---

### "Channel not found"

**Cause:** Channel ID in mapping doesn't exist in current server

**Solutions:**
- Channel may have been deleted
- Invite code may be for different server
- Re-run `/create-course-invite` for correct channel

---

### "Interaction failed" on button click

**Cause:** Discord's 3-second timeout

**Solutions:**
- Normal - user can click again
- Network latency issue
- Bot may be overloaded

---

### Bot not responding at all

**Check:**
1. Is bot running? `ps aux | grep "node index.js"`
2. Check terminal for errors
3. Restart: `pkill -f "node index.js" && npm start`

---

### Google Sheets permission error

**Cause:** Service account doesn't have access

**Solution:**
1. Open your Google Sheet
2. Click Share
3. Add service account email as Editor
4. Service account email is in credentials.json (`client_email`)

---

### "Missing Permissions" for guild

**Cause:** Bot doesn't have required permissions in server

**Solution:**
1. Check bot role has these permissions:
   - Manage Channels
   - Manage Roles
   - Send Messages
   - Create Instant Invite

---

## Maintenance Guide

### How to Update paidLearners.json

Follow these steps to update the learner database:

1. **Download the paidLearners.json file from Metabase:**
   - Go to: https://metabase.interviewbit.com/question/4215-all-mentees-data-only-paid-learners?user_phone_substr=NULL&user_email_substr=NULL&user_name_substr=NULL&superbatch_name_substr=NULL&course_id=&super_batches_names=&email=
   - Click on the download button and select **JSON format**
   - Save the file as `paidLearners.json`

2. **Push the new paidLearners.json file to GitHub repo:**
   ```bash
   git add paidLearners.json
   git commit -m "Update paidLearners.json"
   git push
   ```

3. **Redeploy the project on Railway:**
   - Go to Railway dashboard
   - The project will auto-deploy after GitHub push, OR
   - Manually trigger a redeploy

**Note:** No downtime needed - file is read on each verification.

### Adding New Servers

1. Invite bot using OAuth2 URL
2. Enable required intents in Discord Developer Portal (if not done)
3. Create #get-access channel
4. Run `/setup-access-button`
5. Create course invites with `/create-course-invite`

### Checking Logs

```bash
# If running in foreground
# Logs appear in terminal

# If running in background
tail -f /tmp/bot-output.log
```

### Stopping the Bot

```bash
pkill -f "node index.js"
```

### Restarting the Bot

```bash
pkill -f "node index.js" && npm start
```

---

## Security Notes

1. **No DMs** - Uses Discord Modals (popup forms) to avoid spam detection
2. **Ephemeral messages** - Success/error messages only visible to that user
3. **Permission-based access** - Users can only see channels they're granted access to
4. **Email verification** - Only registered learners can get access
5. **Never commit secrets** - Keep `.env` and `credentials.json` out of git

### Files to NEVER commit:
```
.env
credentials.json
```

Add to `.gitignore`:
```
.env
credentials.json
```

---

## Future Improvements

1. **Metabase Integration**
   - Replace static paidLearners.json with live Metabase API
   - Always up-to-date learner data
   - No manual file updates needed

2. **Rate Limiting**
   - Prevent abuse/spam
   - Limit verifications per user per hour

3. **Admin Dashboard**
   - Web interface to manage invites
   - View verification statistics
   - Manage learner data

4. **Analytics**
   - Track verification success/failure rates
   - Monitor bot usage
   - Identify common issues

---

## Support Contacts

For issues or questions:
- Check bot logs first
- GitHub Repository: [discord-onboarding-bot](https://github.com/MohitPareek000/discord-onboarding-bot)
- Contact: Scaler Community Team

---

## Quick Reference

### Start Bot
```bash
npm start
```

### Stop Bot
```bash
pkill -f "node index.js"
```

### Register Commands
```bash
node setup-commands.js
```

### Check if Bot Running
```bash
ps aux | grep "node index.js"
```

### Key Files
- Main bot: `index.js`
- Google Sheets: `utils/sheets.js`
- Email verification: `utils/emailVerification.js`
- Secrets: `.env`, `credentials.json`
- Learner data: `paidLearners.json`

---

*Last updated: January 2026*
