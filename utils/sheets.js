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
 */
function initializeSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  try {
    const credentialsPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);

    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

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
 * @param {string} data.name - Full name
 * @param {string} data.email - Email address
 * @param {string} data.phone - Phone number
 * @param {string} data.discordUsername - Discord username (e.g., "username#1234")
 * @param {string} data.channel - Channel/course name
 * @returns {Promise<boolean>} Success status
 */
async function appendToSheet(data) {
  try {
    const sheets = initializeSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Prepare row data
    const timestamp = new Date().toISOString();
    const values = [
      [
        timestamp,
        data.name,
        data.email,
        data.phone,
        data.discordUsername,
        data.channel
      ]
    ];

    // Append to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:F', // Adjust sheet name if needed
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

    const headers = [['Timestamp', 'Name', 'Email', 'Phone', 'Discord Username', 'Channel']];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1:F1',
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

module.exports = {
  appendToSheet,
  initializeSheetHeaders
};
