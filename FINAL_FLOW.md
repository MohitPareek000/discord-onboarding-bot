# Final Flow - Simple & Clean

## 🎯 What You Want

**For EVERYONE (new & existing members):**
1. Share #get-access channel link
2. They click button in #get-access
3. Bot DMs: "Hey! Welcome!" + asks for EMAIL first
4. User provides email → Bot verifies in paidLearners.json
5. Bot then asks for INVITE CODE
6. User provides invite code
7. Bot grants access to SPECIFIC channel (from invite code mapping)

---

## 📝 Implementation Summary

### Changes Made:

**1. Button Flow (`verify_course_access`):**
```
User clicks button
→ Bot DMs: "Hey! Welcome! Enter your email"
→ User: email@example.com
→ Bot: Verifies email
→ Bot: "Email verified! Now enter invite code"
→ User: abc123
→ Bot: Looks up channel from inviteMappings.json
→ Bot: Grants access to that specific channel
```

**2. Files Modified:**
- `index.js`: Updated button handler (lines 344-388)
- `utils/onboarding.js`: Added invite code request after email verification (lines 164-179)
- `utils/onboarding.js`: Exported `finalizeOnboarding` function

---

## 🚀 How Admins Use It

### Step 1: One-time setup per server
```
/setup-access-button
```
→ Posts generic button in #get-access

### Step 2: Create course invite
```
/create-course-invite channel:#aiml-batch
```
→ Returns: Link `https://discord.gg/abc123` and Code `abc123`

### Step 3: Share with learners
Send them the **#get-access channel link** (not the course invite link!)

Example: `https://discord.com/channels/SERVER_ID/GET_ACCESS_CHANNEL_ID`

Or just tell them: "Go to #get-access channel"

---

## 👥 Learner Experience

### All Learners (New & Existing):

1. **Go to #get-access channel**
2. **Click "Verify Course Access" button**
3. **Check DMs** - Bot says:
   ```
   Hey! Welcome to your learning journey! 🎓

   We're excited to have you here! To get started with your course,
   we need to verify your information.

   Please enter your registered Scaler email address:
   ```
4. **Reply with email:** `user@example.com`
5. **Bot verifies** and responds:
   ```
   ✅ Email verified successfully!

   Now, please provide your course invite code (the part after discord.gg/)

   Example:
   If your link is https://discord.gg/abc123XYZ
   Just send: abc123XYZ
   ```
6. **Reply with code:** `abc123`
7. **Bot grants access:**
   ```
   ✅ Course found: aiml-batch

   ⏳ Granting access...

   ✅ All set! Your information has been saved successfully.

   You've been assigned the Learner role and now have access to your course materials.

   Welcome aboard! 🎉

   Click the button below to access your course channel:
   [View Course Channel] → Goes to #aiml-batch
   ```

---

## ✅ Benefits

- ✅ **Same flow** for new & existing members
- ✅ **Email first** - verifies they're a Scaler learner
- ✅ **Invite code second** - identifies which course
- ✅ **Fully private** - everything in DMs
- ✅ **No course visibility** - button is generic
- ✅ **Clean #get-access** - just one button
- ✅ **Google Sheets** logging
- ✅ **Automatic** role assignment

---

## 🔧 Technical Flow

```
User clicks button
├─> Bot creates session with needsInviteCode=true
├─> Bot DMs: "Enter email"
├─> User provides email
├─> Bot calls handleResponse() → validates email
├─> If valid:
│   ├─> Bot checks session.needsInviteCode
│   ├─> Bot asks for invite code
│   ├─> Sets session.waitingForInviteCode=true
│   └─> Returns (doesn't finalize yet)
├─> User provides invite code
├─> Bot validates code in inviteMappings.json
├─> If valid:
│   ├─> Sets session.channelId & channelName
│   ├─> Calls finalizeOnboarding()
│   ├─> Grants channel access
│   ├─> Assigns Learner role
│   ├─> Logs to Google Sheets
│   └─> Sends success message with channel link
```

---

## 📊 What Gets Logged

Every verification logs to Google Sheets:
- Timestamp (IST)
- Email (verified from paidLearners.json)
- Discord Username
- Channel Name (from invite code mapping)

---

## ⚡ Quick Test

1. Run `/setup-access-button` in any server
2. Run `/create-course-invite channel:#test-channel`
3. Note the invite code (e.g., `abc123`)
4. Go to #get-access
5. Click "Verify Course Access" button
6. Check your DMs
7. Provide your email
8. Provide the invite code `abc123`
9. You should get access to #test-channel

---

**Status:** Implementation complete, ready to deploy!
