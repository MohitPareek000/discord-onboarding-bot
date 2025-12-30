# Visual Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN CREATES INVITE                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  /create-course-invite channel:#aiml-batch         │
│                                                                   │
│  Bot creates invite to #get-access (NOT course channel)         │
│  Stores mapping: invite_code → target_course_channel            │
│  Returns: https://discord.gg/abc123                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              INVITE LINK SHARED TO LEARNERS                     │
│                  (via Email/WhatsApp/LMS)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│     NEW MEMBER PATH       │   │   EXISTING MEMBER PATH    │
└───────────────────────────┘   └───────────────────────────┘
```

---

## New Member Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User clicks: https://discord.gg/abc123                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Discord: "Join Server" button → User joins                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Bot detects guildMemberAdd event                            │
│     - Identifies invite code used                                │
│     - Looks up target channel from inviteMappings.json          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Bot posts in #get-access channel:                           │
│     "👋 Welcome @user! Click button to verify..."               │
│     [Button: Get Access to #aiml-batch]                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Bot ALSO sends DM to user:                                  │
│     "Please enter your registered email"                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. User replies in DM: "user@example.com"                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Bot verifies email in paidLearners.json                     │
│     - Checks if email exists                                     │
│     - Validates learner data (name, program, batch)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
           ✅ VALID                    ❌ INVALID
                │                           │
                ▼                           ▼
┌──────────────────────────┐   ┌────────────────────────────┐
│  8a. Email found         │   │  8b. Email NOT found       │
│  - Assign Learner role   │   │  - Send error message      │
│  - Grant channel access  │   │  - Offer Retry button      │
│  - Log to Google Sheets  │   │  - Keep session active     │
└──────────────────────────┘   └────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. Bot sends success message with button:                      │
│     "✅ All set! You now have access."                          │
│     [Button: View Course Channel] → Deep link to #aiml-batch    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  10. User clicks button → Redirected to #aiml-batch             │
│      Can now see and access course materials!                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Existing Member Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User clicks: https://discord.gg/abc123                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Discord shows: "You're already in this server"              │
│     User dismisses and opens Discord                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. User navigates to #get-access channel                       │
│     (Channel is visible to @everyone)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. User sees button (from new member's join):                  │
│     [Button: Get Access to #aiml-batch]                         │
│                                                                   │
│     OR if no recent message, user can ask admin to resend       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. User clicks button                                          │
│     Bot receives interactionCreate event                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Bot checks if user already has access                       │
│     If YES → "You already have access!"                         │
│     If NO → Continue verification                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. Bot sends DM: "Please enter your registered email"          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. User replies in DM: "user@example.com"                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. Bot verifies email in paidLearners.json                     │
│     [Same verification as new member flow]                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  10. ✅ Success → Grant access + log to sheets                  │
│      ❌ Failure → Retry button                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  11. User gets access to #aiml-batch                            │
│      Clicks "View Course Channel" button                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVITE MAPPINGS STORAGE                      │
│                    (inviteMappings.json)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  {                                                               │
│    "abc123": {                                                  │
│      "channelId": "1234567890",          ← Target course       │
│      "channelName": "aiml-batch",                              │
│      "label": "AIML Jan 25",                                   │
│      "guildId": "987654321",                                   │
│      "accessChannelId": "111222333",     ← #get-access         │
│      "accessChannelName": "get-access",                        │
│      "createdAt": "2025-12-29T..."                             │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              ONBOARDING SESSIONS (In-Memory)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Map {                                                           │
│    "user_discord_id": {                                         │
│      userId: "123456",                                          │
│      username: "user#1234",                                     │
│      guildId: "987654321",                                      │
│      channelName: "aiml-batch",                                │
│      channelId: "1234567890",                                  │
│      currentStep: 0,                                            │
│      data: {},                    ← Stores email when provided │
│      started: true,                                             │
│      startedAt: 1735481234567                                  │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 EMAIL VERIFICATION LAYER                        │
│                  (paidLearners.json)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  [                                                               │
│    {                                                             │
│      "email": "user@example.com",                              │
│      "name": "John Doe",                                        │
│      "program": "AIML",                                         │
│      "batch": "AIML Jan25 Batch",                              │
│      "super_batch": "AIML Jan25"                               │
│    },                                                            │
│    ...                                                           │
│  ]                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GOOGLE SHEETS LOGGING                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Timestamp (IST)  | Email            | Discord User | Channel   │
│  -------------------------------------------------------------  │
│  2025-12-29 14:30 | user@example.com | user#1234    | aiml-batch│
│  2025-12-29 14:45 | jane@example.com | jane#5678    | aiml-batch│
└─────────────────────────────────────────────────────────────────┘
```

---

## Event Flow

```
┌────────────────────┐
│  Discord Events    │
└────────────────────┘
         │
         ├─── guildMemberAdd ──────► New member joins
         │                           │
         │                           ▼
         │                    ┌──────────────────────┐
         │                    │ 1. Detect invite     │
         │                    │ 2. Get mapping       │
         │                    │ 3. Post in #get-access│
         │                    │ 4. Send DM           │
         │                    └──────────────────────┘
         │
         ├─── interactionCreate ───► Button clicked
         │                           │
         │                           ▼
         │                    ┌──────────────────────┐
         │                    │ 1. Check button ID   │
         │                    │ 2. Verify permissions│
         │                    │ 3. Start session     │
         │                    │ 4. Send DM           │
         │                    └──────────────────────┘
         │
         └─── messageCreate ───────► DM received
                                     │
                                     ▼
                              ┌──────────────────────┐
                              │ 1. Check session     │
                              │ 2. Validate email    │
                              │ 3. Verify in DB      │
                              │ 4. Grant access      │
                              │ 5. Log to sheets     │
                              └──────────────────────┘
```

---

## Permission Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHANNEL PERMISSIONS                          │
└─────────────────────────────────────────────────────────────────┘

#get-access channel:
┌─────────────────────┐
│ @everyone           │
│  ✅ View Channel    │
│  ✅ Send Messages   │
│  ✅ Read History    │
└─────────────────────┘

#course-channel (before verification):
┌─────────────────────┐
│ @everyone           │
│  ❌ View Channel    │  ← Hidden by default
│  ❌ Send Messages   │
└─────────────────────┘

#course-channel (after verification):
┌─────────────────────┐
│ @everyone           │
│  ❌ View Channel    │
└─────────────────────┘
┌─────────────────────┐
│ @user (specific)    │
│  ✅ View Channel    │  ← Granted after email verification
│  ✅ Send Messages   │
│  ✅ Read History    │
└─────────────────────┘
```

---

## Summary

**Key Points:**
- 🎯 Single #get-access channel serves all courses
- 🔄 Same flow for new and existing members (both verify via email)
- 📍 Invite link → #get-access → Email verify → Course channel
- 💾 All data logged: invite mappings, sessions, Google Sheets
- 🔐 Email verification against paidLearners.json (76MB database)
- ✅ Automatic role assignment and channel permissions
