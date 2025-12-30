# Quick Start Guide - Get-Access Flow

## ✅ Implementation Complete!

Your Discord bot now supports **both new AND existing members** accessing channels through a centralized **#get-access** approach.

---

## 🚀 Setup (5 minutes)

### Step 1: Create #get-access Channel

For each Discord server, create a channel named **`get-access`**:

1. Right-click on your Discord server
2. Click "Create Channel"
3. Channel Type: **Text Channel**
4. Channel Name: **`get-access`** (exact name, lowercase)
5. Permissions: Make visible to `@everyone`

**Status Check:**
```bash
node check-get-access.js
```

**Current Status:**
- ✅ SCALER-AIML-LMS - Has #get-access
- ✅ Testing server - Has #get-access
- ❌ SCALER-SDE-LMS - Needs #get-access
- ❌ SCALER-DSML-LMS - Needs #get-access
- ❌ SCALER-DEVOPS-LMS - Needs #get-access

---

### Step 2: Start the Bot

```bash
npm start
```

Bot is now running! ✅

---

## 📝 How to Use

### Creating a Course Invite

In Discord, run:
```
/create-course-invite channel:#your-course-channel  @user2
```

**Example:**
```
/create-course-invite channel:#aiml-jan25-batch 
```

**Bot will respond with:**
```
✅ Course invite created!

Course: aiml-jan25-batch
Target Channel: #aiml-jan25-batch
Invite Link: https://discord.gg/XyZ789

How it works:
• Link takes learners to #get-access channel
• New members → Auto DM for verification
• Existing members → See button in #get-access to verify
• After verification → Access granted to #aiml-jan25-batch
```

---

## 👥 User Experience

### For New Members (Not in server yet)

1. **Clicks invite link** → Joins Discord server
2. **Lands in #get-access channel**
3. **Sees welcome message** with their @mention
4. **Gets DM from bot** asking for email
5. **Replies with email** in DM
6. **Bot verifies email** against paidLearners.json
7. **Gets access** to course channel
8. **Clicks "View Course Channel"** button to jump to course

### For Existing Members (Already in server)

1. **Clicks invite link** → Discord says "You're already in this server"
2. **Navigates to #get-access channel** (visible to everyone)
3. **Sees button:** "Get Access to #course-name"
4. **Clicks button**
5. **Gets DM from bot** asking for email
6. **Replies with email** in DM
7. **Bot verifies email** against paidLearners.json
8. **Gets access** to course channel
9. **Clicks "View Course Channel"** button to jump to course

---

## 🎯 What Gets Verified

Every user (new or existing) must provide:
- ✅ **Email address** - Must exist in `paidLearners.json`

The bot checks:
- Is the email in the paid learners database?
- Does the email match a registered Scaler learner?

If valid:
- ✅ Grants access to course channel
- ✅ Assigns "Learner" role
- ✅ Logs to Google Sheets (timestamp, email, Discord username, channel)

---

## 📊 Google Sheets Logging

Every verification is logged with:
- **Timestamp** (IST timezone)
- **Email** (verified from paidLearners.json)
- **Discord Username** (e.g., "user#1234")
- **Channel Name** (course they joined)

---

## 🔧 Available Commands

| Command | Who Can Use | Description |
|---------|-------------|-------------|
| `/create-course-invite` | Admins only | Create invite to #get-access mapped to course channel |
| `/list-course-invites` | Admins only | List all active course invites and their links |

---

## 🎓 Example Walkthrough

**Scenario:** Admin wants to give access to AIML January 2025 batch

**Step 1:** Create the course channel (if not exists)
```
Create channel: #aiml-jan25-batch
Set permissions: Hidden from @everyone
```

**Step 2:** Create invite link
```
/create-course-invite channel:#aiml-jan25-batch send-to:user@example.com
```

**Step 3:** Share link with learners
```
Send via email/WhatsApp:
"Join our Discord: https://discord.gg/XyZ789"
```

**Step 4:** Learner flow
- New learner: Clicks link → Joins → Gets DM → Verifies → Accesses channel
- Existing learner: Clicks link → Goes to #get-access → Clicks button → Verifies → Accesses channel

---

## ⚠️ Important Notes

### Channel Requirements
- **#get-access** must exist and be visible to @everyone
- **Course channels** should be hidden from @everyone (bot does this automatically)

### Permission Requirements
Bot needs these permissions:
- ✅ Manage Channels (to set permissions)
- ✅ Create Invites
- ✅ Send Messages
- ✅ Manage Roles (to assign Learner role)
- ✅ Read Message History

### Email Verification
- Email MUST exist in `paidLearners.json`
- Case-sensitive email matching
- If email not found, user gets retry button

---

## 🐛 Troubleshooting

**"#get-access channel not found"**
- Run: `node check-get-access.js`
- Create channel named exactly "get-access" (lowercase)

**Button doesn't appear for existing members**
- Check bot has "Send Messages" permission in #get-access
- Verify invite was created via `/create-course-invite`

**"Could not send you a DM"**
- User must enable DMs from server members
- Settings → Privacy & Safety → Allow direct messages from server members

**Email verification fails**
- Email must exist in paidLearners.json
- Check spelling and use registered Scaler email

---

## 📈 Benefits

✅ **Universal solution** - Works for both new and existing members
✅ **Simple UX** - Click link → Land in #get-access → Verify → Access course
✅ **No manual work** - Automated verification against paidLearners.json
✅ **Full tracking** - All verifications logged to Google Sheets
✅ **Scalable** - One #get-access channel handles all courses
✅ **Discoverable** - Existing members can always find #get-access

---

## 🎉 You're All Set!

The bot is running and ready to onboard learners. Just create #get-access channels in your remaining servers and you're good to go!

**Next Steps:**
1. Create #get-access in remaining servers
2. Test with yourself first
3. Create your first course invite
4. Share with learners

**Need help?** Check [GET_ACCESS_FLOW.md](GET_ACCESS_FLOW.md) for detailed technical documentation.
