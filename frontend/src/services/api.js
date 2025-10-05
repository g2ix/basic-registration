import axios from 'axios';

// Detect if running on mobile/network access
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // If accessing from mobile/network, use computer's IP
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://192.168.1.6:8000/api`;
  }
  
  // Default to localhost for development
  return 'http://localhost:8000/api';
};

// Log the API URL for debugging
console.log('API Base URL:', getApiBaseUrl());

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Members API
export const membersAPI = {
  getAll: (params) => api.get('/members', { params }),
  getById: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
  uploadCSV: (formData) => api.post('/members/upload-csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

  // Attendance API
  export const attendanceAPI = {
    checkIn: (data) => api.post('/attendance/checkin', data),
    getAll: (params) => api.get('/attendance', { params }),
    getByControlNumber: (controlNumber) => api.get(`/attendance/control/${controlNumber}`),
    getByMemberId: (memberId) => api.get(`/attendance/member/${memberId}`),
    getSummary: (params) => api.get('/attendance/summary', { params }),
    overrideCheckIn: (memberId) => api.post(`/attendance/override-checkin/${memberId}`),
    removeCheckIn: (memberId) => api.delete(`/attendance/remove-checkin/${memberId}`),
    export: (params) => api.get('/attendance/export', { params, responseType: 'blob' }),
  };

  // Simplified Attendance API
export const simplifiedAttendanceAPI = {
  checkIn: (data) => api.post('/simplified-attendance/checkin', data),
  checkOut: (data) => api.post('/simplified-attendance/checkout', data),
  getAll: (params) => api.get('/simplified-attendance', { params }),
  getByControlNumber: (controlNumber) => api.get(`/simplified-attendance/control/${controlNumber}`),
  getByMemberId: (memberId) => api.get(`/simplified-attendance/member/${memberId}`),
  getStats: (params) => api.get('/simplified-attendance/stats', { params }),
};

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  get: (key) => api.get(`/settings/${key}`),
  update: (key, data) => api.put(`/settings/${key}`, data),
  getCheckoutEnabled: () => api.get('/settings/public/checkout-enabled'),
  resetAllData: (confirmReset) => api.post('/settings/reset-all-data', { confirmReset }),
  resetJourneyData: (confirmReset) => api.post('/settings/reset-journey-data', { confirmReset }),
  getPublicStatistics: () => api.get('/settings/public/statistics'),
};

// Claims API
export const claimsAPI = {
  checkOut: (data) => api.post('/claims/checkout', data),
  getAll: (params) => api.get('/claims', { params }),
  getSummary: (params) => api.get('/claims/summary', { params }),
  overrideCheckOut: (controlNumber) => api.post(`/claims/override-checkout/${controlNumber}`),
  removeCheckOut: (controlNumber) => api.delete(`/claims/remove-checkout/${controlNumber}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
  getAuditLogs: (params) => api.get('/dashboard/audit-logs', { params }),
  exportData: (params) => api.get('/dashboard/export', { params }),
  getSystemStatus: () => api.get('/dashboard/system-status'),
};

export default api;
