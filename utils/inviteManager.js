/**
 * Invite Manager Module
 *
 * Manages invite-to-course mappings for tracking which course
 * a user should be granted access to based on the invite they used.
 */

const fs = require('fs');
const path = require('path');

const MAPPINGS_FILE = path.join(__dirname, '..', 'inviteMappings.json');

/**
 * Load mappings from file
 */
function loadMappings() {
    try {
        if (!fs.existsSync(MAPPINGS_FILE)) {
            return { mappings: {} };
        }
        const content = fs.readFileSync(MAPPINGS_FILE, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Error loading invite mappings:', error.message);
        return { mappings: {} };
    }
}

/**
 * Save mappings to file
 */
function saveMappings(data) {
    try {
        fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving invite mappings:', error.message);
        return false;
    }
}

/**
 * Add a new invite-to-course mapping
 * @param {string} inviteCode - The Discord invite code
 * @param {Object} courseInfo - Course information
 * @param {string} courseInfo.channelId - Target course channel ID
 * @param {string} courseInfo.channelName - Target course channel name
 * @param {string} courseInfo.label - Display label for the course
 * @param {string} courseInfo.program - Program code (e.g., "AIML", "DSML")
 * @param {string} courseInfo.guildId - Guild ID
 */
function addMapping(inviteCode, courseInfo) {
    const data = loadMappings();
    data.mappings[inviteCode] = {
        ...courseInfo,
        createdAt: new Date().toISOString()
    };
    return saveMappings(data);
}

/**
 * Get course info by invite code
 * @param {string} inviteCode - The Discord invite code
 * @returns {Object|null} Course info or null if not found
 */
function getMapping(inviteCode) {
    const data = loadMappings();
    return data.mappings[inviteCode] || null;
}

/**
 * Remove a mapping
 * @param {string} inviteCode - The Discord invite code
 */
function removeMapping(inviteCode) {
    const data = loadMappings();
    delete data.mappings[inviteCode];
    return saveMappings(data);
}

/**
 * Get all mappings for a guild
 * @param {string} guildId - Guild ID
 */
function getMappingsForGuild(guildId) {
    const data = loadMappings();
    const result = {};
    for (const [code, info] of Object.entries(data.mappings)) {
        if (info.guildId === guildId) {
            result[code] = info;
        }
    }
    return result;
}

module.exports = {
    addMapping,
    getMapping,
    removeMapping,
    getMappingsForGuild,
    loadMappings
};
