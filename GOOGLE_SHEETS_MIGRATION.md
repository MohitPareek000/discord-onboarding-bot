# Google Sheets Migration - Invite Mappings

## ✅ What Changed

**Before:**
- Invite mappings stored in local `inviteMappings.json` file
- File-based storage (not suitable for production)
- Manual git commits needed after creating invites
- Lost on fresh deployments

**After:**
- Invite mappings stored in Google Sheets
- Centralized cloud storage
- Automatic sync across all bot instances
- Works in production without git commits

---

## 📊 Google Sheets Structure

A new sheet called **"InviteMappings"** will be created in your existing spreadsheet with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| Invite Code | Discord invite code | `abc123XYZ` |
| Channel ID | Course channel ID | `1234567890` |
| Channel Name | Course channel name | `aiml-batch` |
| Label | Display label | `aiml-batch` |
| Guild ID | Discord server ID | `9876543210` |
| Access Channel ID | #get-access channel ID | `1112223334` |
| Access Channel Name | Always "get-access" | `get-access` |
| Created At | ISO timestamp | `2025-12-30T...` |

---

## 🚀 How to Use

### First Time Setup

1. **Enable Discord Bot Intents** (Required first!)
   - Go to: https://discord.com/developers/applications
   - Select your bot
   - Click **Bot** in left sidebar
   - Scroll to **Privileged Gateway Intents**
   - Enable:
     - ✅ **SERVER MEMBERS INTENT**
     - ✅ **MESSAGE CONTENT INTENT**
   - Click **Save Changes**

2. **Start the bot:**
   ```bash
   npm start
   ```

3. **The bot will automatically create the InviteMappings sheet** on first use

4. **Migrate existing mappings** (optional):
   ```bash
   node migrate-to-sheets.js
   ```
   *(We can create this script if needed)*

---

## 📝 Commands Work the Same

**Creating invites:** (exactly the same)
```
/create-course-invite channel:#your-course
```

Now saves to Google Sheets instead of JSON file!

**Listing invites:** (exactly the same)
```
/list-course-invites
```

Now reads from Google Sheets!

---

## 🔄 What Happens Behind the Scenes

### When Admin Creates Invite:
```javascript
// OLD (inviteMappings.json)
addMapping(code, courseInfo) → Writes to JSON file

// NEW (Google Sheets)
addMapping(code, courseInfo) → Writes to Google Sheets
```

### When User Provides Invite Code:
```javascript
// OLD (inviteMappings.json)
getMapping(code) → Reads from JSON file

// NEW (Google Sheets)
getMapping(code) → Reads from Google Sheets
```

### When Listing Invites:
```javascript
// OLD (inviteMappings.json)
getMappingsForGuild(guildId) → Reads from JSON file

// NEW (Google Sheets)
getMappingsForGuild(guildId) → Reads from Google Sheets
```

---

## ✅ Benefits

### Production Ready
- ✅ **No git commits needed** - Changes are instant
- ✅ **Centralized storage** - All bot instances use same data
- ✅ **Automatic backups** - Google Sheets handles backups
- ✅ **Easy to view** - Open spreadsheet to see all mappings
- ✅ **Easy to edit** - Manually edit if needed

### Scalability
- ✅ **Multiple servers** - Bot can run on multiple machines
- ✅ **High availability** - Google Sheets is cloud-based
- ✅ **No sync issues** - Always latest data

### Debugging
- ✅ **Visual inspection** - See all mappings in spreadsheet
- ✅ **Manual fixes** - Edit directly in Google Sheets
- ✅ **History tracking** - Google Sheets version history

---

## 📂 Files Modified

1. **utils/sheets.js** - Added 4 new functions:
   - `saveInviteMapping()` - Save/update invite mapping
   - `getInviteMapping()` - Get mapping by code
   - `getInviteMappingsForGuild()` - Get all mappings for a server
   - `initializeInviteMappingsSheet()` - Create sheet with headers

2. **utils/inviteManager.js** - Completely rewritten:
   - Removed file operations (`fs`, `path`)
   - Now uses Google Sheets functions
   - All functions are now `async`

3. **index.js** - Added `await` to all mapping calls:
   - Line 149: `await getMapping()`
   - Line 247: `await addMapping()`
   - Line 374: `await getMappingsForGuild()`
   - Line 695: `await getMapping()`

---

## 🗑️ Old Files

**inviteMappings.json** - No longer used!
- Can be deleted or kept as backup
- Not needed for production
- Bot won't read from it anymore

---

## 🧪 Testing

### Test Invite Creation:
1. Start bot: `npm start`
2. Run in Discord: `/create-course-invite channel:#test-channel`
3. Check your Google Spreadsheet → Look for new "InviteMappings" sheet
4. Verify row was added with invite code

### Test Invite Retrieval:
1. In Discord, click "Verify Course Access" button
2. Provide email
3. Provide the invite code you just created
4. Bot should look it up from Google Sheets and grant access

### Test Listing:
1. Run in Discord: `/list-course-invites`
2. Should show all invites from Google Sheets

---

## 🐛 Troubleshooting

### "Sheet not found" error
**Solution:** Bot will auto-create the sheet on first mapping save. Just create an invite.

### "Permission denied" error
**Solution:** Ensure your service account has edit access to the spreadsheet

### Slow performance
**Note:** Google Sheets API calls take ~200-500ms. This is normal.
**Impact:** Minimal - only happens when creating/retrieving invites

### Need to delete a mapping
**Solution:** Open Google Sheets → InviteMappings tab → Delete the row manually

---

## 🔄 Migration Script (Optional)

If you want to migrate existing `inviteMappings.json` to Google Sheets:

```bash
node migrate-to-sheets.js
```

*(Let me know if you need this script created)*

---

## 📈 Production Deployment

1. **Enable Discord bot intents** (as shown above)

2. **Set environment variables:**
   ```bash
   SPREADSHEET_ID=your_spreadsheet_id
   GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
   # OR
   GOOGLE_CREDENTIALS='{"type":"service_account",...}'
   ```

3. **Deploy and start:**
   ```bash
   npm start
   ```

4. **Verify InviteMappings sheet exists:**
   - Open your Google Spreadsheet
   - Check for "InviteMappings" tab

5. **Test creating an invite:**
   ```
   /create-course-invite channel:#test
   ```

6. **Check Google Sheets:**
   - Row should appear in InviteMappings sheet

**Done!** ✅

---

## 🎯 Summary

| Feature | Before (JSON) | After (Google Sheets) |
|---------|---------------|----------------------|
| **Storage** | Local file | Cloud |
| **Production** | ❌ Git commits needed | ✅ Auto-sync |
| **Multi-instance** | ❌ Conflicts | ✅ Works |
| **View mappings** | ❌ Open JSON file | ✅ Open spreadsheet |
| **Edit mappings** | ❌ Edit JSON manually | ✅ Edit sheet directly |
| **Backups** | ❌ Manual | ✅ Google Sheets |
| **Deployment** | ❌ Complex | ✅ Simple |

---

**Migration Date:** 2025-12-30
**Status:** ✅ Complete and ready for production
