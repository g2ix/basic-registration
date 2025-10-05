// Frontend timezone utility functions for Philippine Standard Time (UTC+8)

/**
 * Get current date in Philippine timezone
 * @returns {string} Current date in YYYY-MM-DD format (Philippine time)
 */
export const getCurrentDate = () => {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila'
  });
};

/**
 * Get current datetime in Philippine timezone
 * @returns {string} Current datetime in ISO format (Philippine time)
 */
export const getCurrentDateTime = () => {
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Manila'
  }).replace(' ', 'T') + '+08:00';
};

/**
 * Format date for display in Philippine timezone
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Format datetime for display in Philippine timezone
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

/**
 * Format time for display in Philippine timezone
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

/**
 * Check if a date is today in Philippine timezone
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  const today = getCurrentDate();
  const checkDate = new Date(date).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila'
  });
  return today === checkDate;
};

/**
 * Get Philippine timezone offset
 * @returns {string} Timezone offset (+08:00)
 */
export const getTimezoneOffset = () => {
  return '+08:00';
};

/**
 * Get timezone display name
 * @returns {string} Timezone display name
 */
export const getTimezoneDisplay = () => {
  return 'Philippine Standard Time (UTC+8)';
};

/**
 * Convert UTC date to Philippine time
 * @param {Date|string} utcDate - UTC date
 * @returns {Date} Philippine time date
 */
export const utcToPhilippineTime = (utcDate) => {
  return new Date(utcDate.toLocaleString('en-US', {
    timeZone: 'Asia/Manila'
  }));
};

/**
 * Get relative time in Philippine timezone
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now - targetDate) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};
