/**
 * Invite Manager Module
 *
 * Manages invite-to-course mappings for tracking which course
 * a user should be granted access to based on the invite they used.
 *
 * Now uses Google Sheets for centralized storage instead of local JSON file.
 */

const { saveInviteMapping, getInviteMapping, getInviteMappingsForGuild } = require('./sheets');

/**
 * Add a new invite-to-course mapping
 * @param {string} inviteCode - The Discord invite code
 * @param {Object} courseInfo - Course information
 * @param {string} courseInfo.channelId - Target course channel ID
 * @param {string} courseInfo.channelName - Target course channel name
 * @param {string} courseInfo.label - Display label for the course
 * @param {string} courseInfo.program - Program code (e.g., "AIML", "DSML")
 * @param {string} courseInfo.guildId - Guild ID
 * @returns {Promise<boolean>} Success status
 */
async function addMapping(inviteCode, courseInfo) {
    try {
        await saveInviteMapping(inviteCode, courseInfo);
        return true;
    } catch (error) {
        console.error('❌ Error adding invite mapping:', error.message);
        return false;
    }
}

/**
 * Get course info by invite code
 * @param {string} inviteCode - The Discord invite code
 * @returns {Promise<Object|null>} Course info or null if not found
 */
async function getMapping(inviteCode) {
    try {
        return await getInviteMapping(inviteCode);
    } catch (error) {
        console.error('❌ Error getting invite mapping:', error.message);
        return null;
    }
}

/**
 * Get all mappings for a guild
 * @param {string} guildId - Guild ID
 * @returns {Promise<Object>} Mappings object
 */
async function getMappingsForGuild(guildId) {
    try {
        return await getInviteMappingsForGuild(guildId);
    } catch (error) {
        console.error('❌ Error getting guild mappings:', error.message);
        return {};
    }
}

/**
 * Remove a mapping (legacy function - not implemented for Google Sheets yet)
 * @param {string} inviteCode - The Discord invite code
 */
async function removeMapping(inviteCode) {
    console.warn('⚠️  removeMapping not yet implemented for Google Sheets');
    console.warn('   To remove a mapping, manually delete the row from the InviteMappings sheet');
    return false;
}

/**
 * Load all mappings (legacy function - kept for backwards compatibility)
 * @returns {Promise<Object>} All mappings
 */
async function loadMappings() {
    console.warn('⚠️  loadMappings is deprecated. Use getMappingsForGuild instead.');
    return { mappings: {} };
}

module.exports = {
    addMapping,
    getMapping,
    removeMapping,
    getMappingsForGuild,
    loadMappings
};
