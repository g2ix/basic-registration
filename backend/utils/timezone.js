// Timezone utility functions for Philippine Standard Time (UTC+8)

/**
 * Get current date in Philippine timezone
 * @returns {string} Current date in YYYY-MM-DD format (Philippine time)
 */
const getCurrentDate = () => {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila'
  });
};

/**
 * Get current datetime in Philippine timezone
 * @returns {string} Current datetime in ISO format (Philippine time)
 */
const getCurrentDateTime = () => {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Manila'
  }).replace(' ', 'T') + '+08:00';
};

/**
 * Get current timestamp in Philippine timezone
 * @returns {Date} Current timestamp (Philippine time)
 */
const getCurrentTimestamp = () => {
  return new Date();
};

/**
 * Format date for SQLite queries (Philippine timezone)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDateForSQLite = (date = new Date()) => {
  return date.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila'
  });
};

/**
 * Format datetime for SQLite queries (Philippine timezone)
 * @param {Date} date - Date to format
 * @returns {string} Formatted datetime string
 */
const formatDateTimeForSQLite = (date = new Date()) => {
  return date.toLocaleString('sv-SE', {
    timeZone: 'Asia/Manila'
  });
};

/**
 * Check if a date is today in Philippine timezone
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today
 */
const isToday = (date) => {
  const today = getCurrentDate();
  const checkDate = formatDateForSQLite(date);
  return today === checkDate;
};

/**
 * Get Philippine timezone offset
 * @returns {string} Timezone offset (+08:00)
 */
const getTimezoneOffset = () => {
  return '+08:00';
};

/**
 * Convert UTC date to Philippine time
 * @param {Date} utcDate - UTC date
 * @returns {Date} Philippine time date
 */
const utcToPhilippineTime = (utcDate) => {
  return new Date(utcDate.toLocaleString('en-US', {
    timeZone: 'Asia/Manila'
  }));
};

/**
 * Convert Philippine time to UTC
 * @param {Date} philippineDate - Philippine time date
 * @returns {Date} UTC date
 */
const philippineTimeToUTC = (philippineDate) => {
  const utcTime = philippineDate.getTime() - (8 * 60 * 60 * 1000);
  return new Date(utcTime);
};

module.exports = {
  getCurrentDate,
  getCurrentDateTime,
  getCurrentTimestamp,
  formatDateForSQLite,
  formatDateTimeForSQLite,
  isToday,
  getTimezoneOffset,
  utcToPhilippineTime,
  philippineTimeToUTC
};
