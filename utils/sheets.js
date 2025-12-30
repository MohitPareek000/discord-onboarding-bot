/**
 * Google Sheets Helper Module
 *
 * Handles all interactions with Google Sheets API
 */

const { google } = require('googleapis');
const path = require('path');

let sheetsClient = null;

/**
 * Initialize Google Sheets API client
 * Supports both local credentials file and Railway environment variable
 */
function initializeSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  try {
    let auth;

    // Railway deployment: credentials stored as JSON string in environment variable
    if (process.env.GOOGLE_CREDENTIALS) {
      console.log('📋 Using Google credentials from GOOGLE_CREDENTIALS environment variable');
      auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }
    // Local development: use credentials.json file
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('📋 Using Google credentials from file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      const credentialsPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);

      auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }
    else {
      throw new Error('No Google credentials found. Set GOOGLE_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS environment variable');
    }

    sheetsClient = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API client initialized');
    return sheetsClient;
  } catch (error) {
    console.error('❌ Failed to initialize Google Sheets client:', error.message);
    throw error;
  }
}

/**
 * Append a row of data to the Google Sheet
 *
 * @param {Object} data - User data to append
 * @param {string} data.email - Email address
 * @param {string} data.discordUsername - Discord username (e.g., "username#1234")
 * @param {string} data.channel - Channel/course name
 * @returns {Promise<boolean>} Success status
 */
async function appendToSheet(data) {
  try {
    const sheets = initializeSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Prepare row data with IST timestamp (Asia/Kolkata)
    const now = new Date();
    const timestamp = now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const values = [
      [
        timestamp,
        data.email,
        data.discordUsername,
        data.channel
      ]
    ];

    // Append to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:D', // Adjust sheet name if needed
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values
      }
    });

    console.log('✅ Data appended to Google Sheet successfully');
    console.log(`   📊 Updated range: ${response.data.updates.updatedRange}`);
    return true;
  } catch (error) {
    console.error('❌ Error appending to Google Sheet:', error.message);

    // Log more details for common errors
    if (error.code === 404) {
      console.error('   💡 Spreadsheet not found. Check your SPREADSHEET_ID in .env');
    } else if (error.code === 403) {
      console.error('   💡 Permission denied. Ensure the service account has edit access to the sheet');
    }

    throw error;
  }
}

/**
 * Initialize sheet with headers if needed
 * Call this manually or on first run to set up the sheet
 */
async function initializeSheetHeaders() {
  try {
    const sheets = initializeSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const headers = [['Timestamp', 'Email', 'Discord Username', 'Channel']];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1:D1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: headers
      }
    });

    console.log('✅ Sheet headers initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing headers:', error.message);
    throw error;
  }
}

/**
 * Add or update an invite mapping in Google Sheets
 *
 * @param {string} inviteCode - Discord invite code
 * @param {Object} courseInfo - Course information
 * @returns {Promise<boolean>} Success status
 */
async function saveInviteMapping(inviteCode, courseInfo) {
  try {
    const sheets = initializeSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = 'InviteMappings'; // Separate sheet for mappings

    // Check if invite code already exists
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`
    });

    const rows = existingData.data.values || [];
    const existingRowIndex = rows.findIndex(row => row[0] === inviteCode);

    const timestamp = new Date().toISOString();
    const rowData = [
      inviteCode,
      courseInfo.channelId,
      courseInfo.channelName,
      courseInfo.label || courseInfo.channelName,
      courseInfo.guildId,
      courseInfo.accessChannelId || '',
      courseInfo.accessChannelName || '',
      timestamp
    ];

    if (existingRowIndex > 0) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${existingRowIndex + 1}:H${existingRowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [rowData]
        }
      });
      console.log(`✅ Updated invite mapping in Google Sheets: ${inviteCode}`);
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:H`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [rowData]
        }
      });
      console.log(`✅ Added invite mapping to Google Sheets: ${inviteCode}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error saving invite mapping:', error.message);

    // If sheet doesn't exist, create it
    if (error.message.includes('Unable to parse range')) {
      console.log('📋 InviteMappings sheet not found, creating it...');
      await initializeInviteMappingsSheet();
      // Retry
      return saveInviteMapping(inviteCode, courseInfo);
    }

    throw error;
  }
}

/**
 * Get an invite mapping from Google Sheets
 *
 * @param {string} inviteCode - Discord invite code
 * @returns {Promise<Object|null>} Course info or null
 */
async function getInviteMapping(inviteCode) {
  try {
    const sheets = initializeSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = 'InviteMappings';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:H`
    });

    const rows = response.data.values || [];

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === inviteCode) {
        return {
          channelId: row[1],
          channelName: row[2],
          label: row[3],
          guildId: row[4],
          accessChannelId: row[5],
          accessChannelName: row[6],
          createdAt: row[7]
        };
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting invite mapping:', error.message);
    return null;
  }
}

/**
 * Get all invite mappings for a specific guild
 *
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Mappings object
 */
async function getInviteMappingsForGuild(guildId) {
  try {
    const sheets = initializeSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = 'InviteMappings';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:H`
    });

    const rows = response.data.values || [];
    const mappings = {};

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[4] === guildId) { // guildId is in column 5 (index 4)
        mappings[row[0]] = {
          channelId: row[1],
          channelName: row[2],
          label: row[3],
          guildId: row[4],
          accessChannelId: row[5],
          accessChannelName: row[6],
          createdAt: row[7]
        };
      }
    }

    return mappings;
  } catch (error) {
    console.error('❌ Error getting guild mappings:', error.message);
    return {};
  }
}

/**
 * Initialize InviteMappings sheet with headers
 */
async function initializeInviteMappingsSheet() {
  try {
    const sheets = initializeSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // First, create the sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: 'InviteMappings'
            }
          }
        }]
      }
    });

    // Then add headers
    const headers = [['Invite Code', 'Channel ID', 'Channel Name', 'Label', 'Guild ID', 'Access Channel ID', 'Access Channel Name', 'Created At']];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'InviteMappings!A1:H1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: headers
      }
    });

    console.log('✅ InviteMappings sheet initialized');
    return true;
  } catch (error) {
    // Sheet might already exist
    if (error.message.includes('already exists')) {
      console.log('ℹ️  InviteMappings sheet already exists');
      return true;
    }
    console.error('❌ Error initializing InviteMappings sheet:', error.message);
    throw error;
  }
}

module.exports = {
  appendToSheet,
  initializeSheetHeaders,
  saveInviteMapping,
  getInviteMapping,
  getInviteMappingsForGuild,
  initializeInviteMappingsSheet
};
