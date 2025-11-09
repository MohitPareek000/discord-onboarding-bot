/**
 * Validation Utilities
 *
 * Input validation for email, phone, and other user data
 */

/**
 * Validate email address format
 *
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number format
 * Accepts various formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhone(phone) {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');

  // Accept 10-15 digits (covers most international formats)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Validate name format
 *
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid
 */
function isValidName(name) {
  const trimmed = name.trim();
  // Must be at least 2 characters and contain at least one letter
  return trimmed.length >= 2 && /[a-zA-Z]/.test(trimmed);
}

/**
 * Sanitize input to prevent injection attacks
 *
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
  return input.trim().replace(/[\r\n\t]/g, ' ').substring(0, 500);
}

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidName,
  sanitizeInput
};
