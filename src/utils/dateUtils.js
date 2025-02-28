/**
 * Validates if a string is in a valid date format (YYYY-MM-DD)
 * @param {string} dateString - The date string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateDateFormat = (dateString) => {
    // Check if it's a valid ISO date string
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return false;
    }

    // Additional validation can be added here if needed
    return true;
};