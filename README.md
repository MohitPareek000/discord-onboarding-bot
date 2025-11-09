# Discord Onboarding Bot 🤖

A production-ready Discord bot that automates user onboarding with Google Sheets integration. When new members join your Discord server, the bot collects their information via DM, saves it to Google Sheets, and assigns them the appropriate role.

## Features

✅ Automatic DM onboarding for new members
✅ Collects: Full Name, Email, Phone Number, Discord ID
✅ Tracks which invite link/channel was used to join
✅ **Automatically grants access to the original channel** after onboarding
✅ Saves all data to Google Sheets with timestamp
✅ Assigns "Learner" role after successful onboarding
✅ Input validation for email and phone numbers
✅ Error handling for DM-disabled users and API failures
✅ Clean modular architecture
✅ Comprehensive console logging

## Prerequisites

- **Node.js** v18.0.0 or higher
- A **Discord Bot** with proper permissions
- A **Google Cloud Service Account** with Sheets API access
- A **Google Sheet** for storing data

## Project Structure

```
discord-onboarding-bot/
├── index.js                 # Main bot entry point
├── utils/
│   ├── onboarding.js        # Onboarding flow handler
│   ├── sheets.js            # Google Sheets API helper
│   └── validators.js        # Input validation utilities
├── package.json             # Dependencies
├── .env                     # Environment variables (create this)
├── .env.example             # Environment variables template
├── credentials.json         # Google service account key (add this)
└── README.md                # This file
```

## Setup Instructions

### 1. Clone or Download the Project

Save all project files to a directory on your local machine.

### 2. Install Dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

### 3. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** and give it a name
3. Go to the **"Bot"** tab and click **"Add Bot"**
4. Under **"Privileged Gateway Intents"**, enable:
   - ✅ **PRESENCE INTENT**
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **MESSAGE CONTENT INTENT**
5. Click **"Reset Token"** and copy your bot token (save it securely)
6. Go to **OAuth2 → URL Generator**:
   - Select scopes: `bot`
   - Select permissions:
     - ✅ Manage Roles
     - ✅ Manage Channels (needed to set channel permissions)
     - ✅ Read Messages/View Channels
     - ✅ Send Messages
     - ✅ Manage Messages
   - Copy the generated URL and open it in a browser to invite the bot to your server

### 4. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name the first sheet **"Sheet1"** (or adjust in code)
4. Add headers in the first row:
   ```
   Timestamp | Name | Email | Phone | DiscordID | Channel
   ```
5. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
   ```

### 5. Set Up Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Go to **APIs & Services → Library**
   - Search for "Google Sheets API"
   - Click **Enable**
4. Create a **Service Account**:
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → Service Account**
   - Give it a name (e.g., "discord-bot-sheets")
   - Click **Done**
5. Create a **JSON Key**:
   - Click on the service account you just created
   - Go to **Keys → Add Key → Create New Key**
   - Select **JSON** and click **Create**
   - A JSON file will be downloaded
6. **Rename** the downloaded file to `credentials.json`
7. **Move** it to your project's root directory
8. **Share your Google Sheet** with the service account email:
   - Open your Google Sheet
   - Click **Share**
   - Paste the service account email (found in `credentials.json` under `client_email`)
   - Give it **Editor** permissions

### 6. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual values:
   ```env
   DISCORD_TOKEN=your_actual_discord_bot_token
   SPREADSHEET_ID=your_actual_spreadsheet_id
   GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
   LEARNER_ROLE_NAME=Learner
   ```

### 7. Create the "Learner" Role in Discord

1. Go to your Discord server
2. Go to **Server Settings → Roles**
3. Create a new role named **"Learner"** (or match the name in your `.env`)
4. Ensure the bot's role is **higher** than the "Learner" role in the role hierarchy

### 8. Run the Bot

Start the bot locally:

```bash
npm start
```

You should see:
```
✅ Discord Onboarding Bot is online!
🤖 Logged in as: YourBotName#1234
📊 Serving 1 server(s)
📋 Cached X invites for guild: YourServer
🚀 Bot is ready to onboard new members!
```

## Usage

### Setting Up Private Course Channels (Recommended)

For best results, set up private channels for each course:

1. Create a private channel (e.g., #python-course)
2. Set permissions so @everyone **cannot** view the channel
3. Make sure the bot **can** view and manage the channel
4. Create an invite link for this specific channel
5. Share this invite link with students enrolling in that course

When users join via this invite, they'll complete onboarding and automatically gain access to that specific channel!

### Testing the Bot

1. Create an invite link in your Discord server for a specific channel (e.g., #course-channel)
2. Use the invite link to join the server with a test account
3. The bot will automatically DM the new user and ask for:
   - Full Name
   - Email
   - Phone Number
4. After answering all questions, the bot will:
   - Save the data to your Google Sheet
   - Assign the "Learner" role
   - Grant access to the channel they joined from
   - Send a confirmation message with channel mention

### Console Output Example

```
👋 New member joined: TestUser#5678 (123456789012345678)
🔗 Used invite code: abc123XYZ
📺 Channel: course-channel (1234567890123456789)
📝 Started onboarding session for TestUser#5678
   ✓ name: John Doe
   ✓ email: john@example.com
   ✓ phone: +1234567890
📊 Saving data to Google Sheets for user 123456789012345678...
✅ Data appended to Google Sheet successfully
   📊 Updated range: Sheet1!A2:F2
✅ Assigned "Learner" role to TestUser#5678
✅ Granted access to channel #course-channel for TestUser#5678
✅ Onboarding completed for TestUser#5678
   📋 Name: John Doe
   📧 Email: john@example.com
   📱 Phone: +1234567890
   🆔 Discord ID: 123456789012345678
   📺 Channel: course-channel
```

## How It Works

### Invite Tracking

The bot caches all server invite links and their usage counts. When a new member joins, it compares the cached data with current invites to detect which link was used. This helps identify which course/channel the user belongs to.

### Onboarding Flow

1. **Member joins** → Bot detects the join and the invite used (tracks channel ID)
2. **DM sent** → Bot sends a welcome message with the first question
3. **User responds** → Bot validates the input
4. **Next question** → Process repeats for each question
5. **Data saved** → All data is pushed to Google Sheets
6. **Role assigned** → User receives the "Learner" role
7. **Channel access** → User is granted permission to view the channel they joined from
8. **Confirmation** → User gets a success message with channel mention

### Data Validation

- **Name**: At least 2 characters, must contain letters
- **Email**: Standard RFC 5322 format validation
- **Phone**: 10-15 digits (accepts various formats)
- **Input sanitization**: Removes line breaks, limits length

## Troubleshooting

### Bot doesn't respond when a user joins

- Ensure **Server Members Intent** is enabled in Discord Developer Portal
- Check that the bot has permission to **Send Messages** in DMs
- Verify the bot is online (check console output)

### "Could not create DM" error

- The user has DMs disabled in their privacy settings
- Ask users to enable "Allow direct messages from server members" in their Discord privacy settings

### Google Sheets errors

| Error | Solution |
|-------|----------|
| `404 - Spreadsheet not found` | Check your `SPREADSHEET_ID` in `.env` |
| `403 - Permission denied` | Share the sheet with the service account email |
| `401 - Invalid credentials` | Verify `credentials.json` path and content |

### Role not assigned

- Ensure the role name in `.env` matches exactly (case-sensitive)
- Make sure the bot's role is higher than "Learner" in the role hierarchy
- Verify the bot has **Manage Roles** permission

### "Cannot find module" errors

- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then run `npm install`

## Configuration Options

### Change Sheet Name

Edit `utils/sheets.js` line 54:
```javascript
range: 'Sheet1!A:F',  // Change 'Sheet1' to your sheet name
```

### Change Questions

Edit `utils/onboarding.js` in the `QUESTIONS` object to customize questions, validation, or error messages.

### Change Role Name

Update the `LEARNER_ROLE_NAME` variable in your `.env` file.

## Development

### Running in Development Mode (with auto-restart)

```bash
npm run dev
```

This uses Node's `--watch` flag to restart the bot when files change (requires Node v18+).

### Manual Header Initialization

If your sheet doesn't have headers, you can initialize them programmatically:

```javascript
const { initializeSheetHeaders } = require('./utils/sheets');
await initializeSheetHeaders();
```

## Security Best Practices

⚠️ **Important Security Notes:**

- **Never commit** `.env` or `credentials.json` to version control
- Keep your Discord bot token secret
- Don't share your Google service account credentials
- Regularly rotate your bot token if exposed
- Review Google Sheet permissions periodically

## File Descriptions

| File | Purpose |
|------|---------|
| `index.js` | Main bot entry point, event handlers, invite tracking |
| `utils/onboarding.js` | Manages DM conversation flow and data collection |
| `utils/sheets.js` | Google Sheets API integration |
| `utils/validators.js` | Input validation and sanitization |
| `package.json` | Project dependencies and scripts |
| `.env` | Environment configuration (not tracked in git) |
| `credentials.json` | Google service account key (not tracked in git) |

## Dependencies

- **discord.js** v14.14.1 - Discord API library
- **dotenv** v16.4.1 - Environment variable management
- **googleapis** v131.0.0 - Google Sheets API client

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review console logs for error messages
3. Verify all setup steps were completed
4. Check Discord and Google API documentation

## Deployment to Railway

Railway provides an easy way to deploy your Discord bot to the cloud with automatic deployments from GitHub.

### Prerequisites for Railway Deployment

- A [Railway account](https://railway.app/) (free tier available)
- Your project pushed to a GitHub repository
- Your Discord bot token
- Your Google Sheets credentials (service account JSON)

### Step-by-Step Railway Deployment

#### 1. Prepare Your Repository

Ensure your project is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

#### 2. Set Up Railway Project

1. Go to [Railway](https://railway.app/) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select your Discord bot repository
6. Railway will automatically detect it as a Node.js project

#### 3. Configure Environment Variables

In your Railway project dashboard:

1. Click on your service
2. Go to the **"Variables"** tab
3. Add the following environment variables:

```
DISCORD_TOKEN=your_discord_bot_token
SPREADSHEET_ID=your_google_spreadsheet_id
LEARNER_ROLE_NAME=Learner
```

#### 4. Add Google Service Account Credentials

Since `credentials.json` is a file, you need to add it as an environment variable:

1. Open your local `credentials.json` file
2. Copy the entire JSON content
3. In Railway Variables, add:
   ```
   GOOGLE_APPLICATION_CREDENTIALS_JSON=<paste entire JSON content here>
   ```

4. Update your code to handle this (add this to the top of `utils/sheets.js` after imports):

```javascript
// Handle Railway deployment where credentials are stored as env variable
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const fs = require('fs');
  const path = require('path');
  const credPath = path.join(__dirname, '..', 'credentials.json');
  fs.writeFileSync(credPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
}
```

Alternatively, use the JSON directly without writing to file (recommended for Railway):

Set `GOOGLE_CREDENTIALS` as the JSON string and modify `utils/sheets.js` to use:
```javascript
const auth = new google.auth.GoogleAuth({
  credentials: process.env.GOOGLE_CREDENTIALS
    ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
    : undefined,
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
```

#### 5. Deploy

Railway will automatically:
- Install dependencies (`npm install`)
- Start your bot using the `start` script from `package.json`
- Restart on failure (configured in `railway.json`)

#### 6. Monitor Your Deployment

1. Check the **"Deployments"** tab to see build logs
2. Go to **"Logs"** tab to see runtime output
3. You should see your bot's startup messages:
   ```
   ✅ Discord Onboarding Bot is online!
   🤖 Logged in as: YourBotName#1234
   ```

#### 7. Verify Bot is Running

1. Check your Discord server - the bot should show as online
2. Test by having a new member join via an invite link
3. Monitor Railway logs for any errors

### Railway Configuration Files

The following files have been added to optimize Railway deployment:

- **railway.json** - Railway service configuration
- **.railwayignore** - Files to exclude from deployment

### Automatic Deployments

Railway automatically redeploys your bot when you push changes to GitHub:

```bash
git add .
git commit -m "Update bot features"
git push origin main
```

Railway will detect the push and redeploy automatically.

### Important Notes for Railway

- Railway's free tier includes 500 hours/month of usage
- Your bot will stay running 24/7 (approximately 720 hours/month)
- Consider upgrading to Railway's paid plan for production use
- Railway provides automatic SSL and environment isolation
- Logs are retained for debugging

### Troubleshooting Railway Deployment

| Issue | Solution |
|-------|----------|
| Build fails | Check Railway build logs for missing dependencies |
| Bot goes offline | Check Railway logs for runtime errors |
| Environment variables not working | Verify all variables are set correctly in Railway dashboard |
| Google Sheets errors | Ensure `GOOGLE_CREDENTIALS` JSON is valid and properly formatted |
| Out of free hours | Upgrade to Railway Pro or use a different deployment platform |

### Alternative: Using Railway CLI

You can also deploy using the Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add environment variables
railway variables set DISCORD_TOKEN=your_token
railway variables set SPREADSHEET_ID=your_spreadsheet_id

# Deploy
railway up
```

## License

MIT License - Feel free to modify and use for your projects!

---

**Made with ❤️ for Discord server automation**
