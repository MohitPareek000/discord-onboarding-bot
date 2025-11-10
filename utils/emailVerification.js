const fs = require('fs');
const path = require('path');

/**
 * Verifies if an email exists in the paidLearners.json file
 * @param {string} email - The email address to verify
 * @returns {Object} - { isVerified: boolean, learnerData: Object|null }
 */
function verifyPaidLearner(email) {
    try {
        // Path to paidLearners.json
        const paidLearnersPath = path.join(__dirname, '..', 'paidLearners.json');

        // Check if file exists
        if (!fs.existsSync(paidLearnersPath)) {
            console.error('paidLearners.json file not found');
            return { isVerified: false, learnerData: null };
        }

        // Read and parse the JSON file
        const fileContent = fs.readFileSync(paidLearnersPath, 'utf8');
        const paidLearners = JSON.parse(fileContent);

        // Normalize the email for comparison (case-insensitive)
        const normalizedEmail = email.toLowerCase().trim();

        // Search for the learner by email
        const learner = paidLearners.find(
            learner => learner.email && learner.email.toLowerCase().trim() === normalizedEmail
        );

        if (learner) {
            console.log(`✓ Email verified: ${email} is a paid learner`);
            return {
                isVerified: true,
                learnerData: {
                    name: learner.name,
                    email: learner.email,
                    program: learner.program,
                    batch: learner.batch
                }
            };
        } else {
            console.log(`✗ Email not found: ${email} is not a paid learner`);
            return { isVerified: false, learnerData: null };
        }

    } catch (error) {
        console.error('Error verifying paid learner:', error);
        return { isVerified: false, learnerData: null };
    }
}

module.exports = { verifyPaidLearner };
