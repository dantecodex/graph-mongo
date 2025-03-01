export const validateDateFormat = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return false;
    }
    return true;
};