# Get-Access Channel Flow

## Overview

This bot now uses a **centralized #get-access channel** approach to handle both new and existing members seamlessly.

---

## How It Works

### 1. Setup (One-time)

Create a channel named **`get-access`** in your Discord server:
- Make it visible to `@everyone`
- This is where all course invite links will point to
- Both new and existing members will land here first

### 2. Creating Course Invites

**Admin Command:**
```
/create-course-invite channel:#course-channel-name
```

**What happens:**
- Bot creates an invite link to **#get-access** (not the course channel)
- Bot stores mapping: `invite_code → target_course_channel`
- Bot hides the actual course channel from `@everyone`
- Returns invite link: `https://discord.gg/abc123`

---

## User Flows

### Flow A: New Member (Never joined server before)

```
1. User clicks: https://discord.gg/abc123
2. Discord: "Join Server" → User joins
3. Bot posts in #get-access: "👋 Welcome @user! Click button to verify..."
4. Bot also DMs user: "Please enter your email"
5. User replies in DM with email
6. Bot verifies email against paidLearners.json
7. Bot logs to Google Sheets
8. Bot grants access to actual course channel
9. Bot sends button: "View Course Channel" (deep link to course)
```

**User Experience:**
- Clicks link → Joins server
- Sees #get-access channel
- Gets DM asking for email
- Enters email in DM
- Gets access to course channel

---

### Flow B: Existing Member (Already in server)

```
1. User clicks: https://discord.gg/abc123
2. Discord shows: "You're already in this server"
3. User navigates to #get-access channel (they can see it)
4. User sees button: "Get Access to #course-name"
5. User clicks button
6. Bot DMs: "Please enter your email"
7. User replies in DM with email
8. Bot verifies email against paidLearners.json
9. Bot logs to Google Sheets
10. Bot grants access to course channel
11. Bot sends button: "View Course Channel" (deep link)
```

**User Experience:**
- Clicks link → "Already in server"
- Goes to #get-access channel
- Clicks button
- Enters email in DM
- Gets access to course channel

---

## Why This Works

✅ **Works for NEW members** - They join via invite, land in #get-access, get DM'd automatically

✅ **Works for EXISTING members** - They see button in #get-access channel they can click

✅ **No Discord API limitation** - We control #get-access, so we can detect activity there

✅ **Tracks which course** - Invite code maps to target channel in inviteMappings.json

✅ **Email verification** - All users must verify email against paidLearners.json

✅ **Google Sheets logging** - All verifications logged with timestamp, email, username, channel

✅ **Automatic redirect** - After verification, users get deep link button to course channel

---

## Commands

| Command | Who | Description |
|---------|-----|-------------|
| `/create-course-invite` | Admins | Create invite to #get-access mapped to course channel |
| `/list-course-invites` | Admins | List all active course invites |

---

## Technical Details

### Invite Mapping Structure
```json
{
  "abc123": {
    "channelId": "123456789",
    "channelName": "aiml-batch-1",
    "label": "aiml-batch-1",
    "guildId": "987654321",
    "accessChannelId": "111222333",
    "accessChannelName": "get-access",
    "createdAt": "2025-12-29T..."
  }
}
```

### Events Used
- **`guildMemberAdd`** - Detects new member, posts welcome in #get-access, sends DM
- **`interactionCreate`** - Handles button clicks from existing members in #get-access
- **`messageCreate`** - Handles DM responses during email verification

---

## Setup Instructions

### 1. Create #get-access Channel
```
1. Create text channel named "get-access"
2. Set permissions: @everyone can View and Send Messages
3. Pin a message explaining: "Click the button above to verify access"
```

### 2. Create Course Invite
```
/create-course-invite channel:#aiml-batch-1 
```

### 3. Share Link
Send the invite link `https://discord.gg/abc123` to learners via:
- Email
- WhatsApp
- LMS platform

---

## Example Scenario

**Admin creates invite for AI/ML course:**

```
/create-course-invite channel:#aiml-jan25 send-to:user@example.com
```

**Bot responds:**
```
✅ Course invite created!

Course: aiml-jan25
Target Channel: #aiml-jan25
Invite Link: https://discord.gg/XyZ789

How it works:
• Link takes learners to #get-access channel
• New members → Auto DM for verification
• Existing members → See button in #get-access to verify
• After verification → Access granted to #aiml-jan25
```

**Learner receives link:**
- New member: Joins → Sees #get-access → Gets DM → Verifies → Accesses #aiml-jan25
- Existing member: Clicks → Goes to #get-access → Clicks button → Verifies → Accesses #aiml-jan25

---

## Troubleshooting

**"#get-access channel not found"**
- Create a text channel named exactly "get-access"
- Make sure bot has permission to read/write in it

**"Button doesn't appear in #get-access"**
- Check bot permissions: Send Messages, Embed Links
- Verify invite was created via `/create-course-invite`

**"Could not send you a DM"**
- User needs to enable DMs from server members
- Settings → Privacy & Safety → Allow DMs from server members

**"Email not found"**
- Email must exist in paidLearners.json
- Contact admin to verify registration

---

## Benefits Over Previous Approaches

| Previous | New (#get-access) |
|----------|-------------------|
| ❌ Existing members couldn't use invites | ✅ Works for both new & existing |
| ❌ Required manual `/verify-access` command | ✅ Simple button click |
| ❌ Confusing user experience | ✅ Clear flow with visual cues |
| ❌ Hard to discover for existing members | ✅ Everyone sees #get-access channel |

---

**✅ Implementation Complete!** This approach solves the Discord API limitation by using #get-access as a universal entry point for all learners.
