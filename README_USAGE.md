# Discord Onboarding Bot - Quick Reference

## 🚀 Bot Status
- ✅ **Running** (PID: 8760)
- 🤖 **Name:** ScalerNewBot#9446
- 📊 **Servers:** 5
- 🎯 **Solution:** Get-Access Channel Flow

---

## ⚡ Quick Commands

### For Admins

**Create Course Invite:**
```
/create-course-invite channel:#your-course-channel
```
Returns: `https://discord.gg/abc123`

**List All Invites:**
```
/list-course-invites
```
Shows all active course invites

---

## 👥 For Learners

### New Member (Not in server)
1. Click invite link
2. Join server
3. Get DM from bot
4. Reply with email
5. Access granted ✅

### Existing Member (Already in server)
1. Click invite link
2. Go to #get-access channel
3. Click "Get Access" button
4. Reply to DM with email
5. Access granted ✅

---

## 📋 Setup Requirements

### Each Server Needs:
- ✅ Channel named `get-access` (exact, lowercase)
- ✅ Visible to @everyone
- ✅ Bot has Send Messages permission

### Check Setup:
```bash
node check-get-access.js
```

**Current Status:**
- ✅ SCALER-AIML-LMS
- ✅ Testing server
- ⚠️  SCALER-SDE-LMS (needs #get-access)
- ⚠️  SCALER-DSML-LMS (needs #get-access)
- ⚠️  SCALER-DEVOPS-LMS (needs #get-access)

---

## 🔧 Maintenance

### Start Bot:
```bash
npm start
```

### Deploy Commands:
```bash
node setup-commands.js
```

### Check Bot Status:
```bash
ps aux | grep "node index.js"
```

### View Logs:
```bash
cat /tmp/bot.log
```

---

## 📊 What Gets Logged

Every verification logs to Google Sheets:
- Timestamp (IST)
- Email (verified)
- Discord Username
- Channel Name

---

## ⚠️ Common Issues

**"#get-access channel not found"**
→ Create channel named exactly "get-access"

**"Could not send you a DM"**
→ Enable DMs in Privacy Settings

**"Email not found"**
→ Email must be in paidLearners.json

---

## 📚 Documentation

- **GET_ACCESS_FLOW.md** - Technical details
- **QUICK_START.md** - Full setup guide
- **FLOW_DIAGRAM.md** - Visual flows
- **IMPLEMENTATION_SUMMARY.md** - Complete changes log

---

## 🎯 The Flow in 3 Steps

1. **Admin:** Create invite with `/create-course-invite`
2. **Share:** Send link to learners via email/WhatsApp
3. **Auto:** Bot handles verification & access

That's it! 🎉

---

**Last Updated:** 2025-12-29
**Version:** Get-Access Channel Solution v1.0
