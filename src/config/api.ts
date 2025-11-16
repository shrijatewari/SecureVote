import axios from 'axios';

const resolveDefaultBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    // Ensure it ends with /api
    return envUrl.endsWith('/api') ? envUrl : (envUrl.endsWith('/') ? `${envUrl}api` : `${envUrl}/api`);
  }

  // Always use localhost:3000/api for local development
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    
    if (isLocalhost) {
      return 'http://localhost:3000/api';
    }

    // For production/Vercel, use environment variable or default
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    return `${backendUrl}/api`;
  }

  return 'http://localhost:3000/api';
};

const API_BASE_URL = resolveDefaultBaseUrl();

if (typeof window !== 'undefined') {
  console.log(`[API Config] Base URL: ${API_BASE_URL}`);
  if (!import.meta.env.VITE_API_URL) {
    console.warn(
      `[API Config] VITE_API_URL not set. Using derived base URL: ${API_BASE_URL}`
    );
  }
}

// Ensure baseURL ends with /api but doesn't have double slashes
const normalizeBaseURL = (url: string) => {
  if (!url.endsWith('/api')) {
    return url.endsWith('/') ? `${url}api` : `${url}/api`;
  }
  return url;
};

export const api = axios.create({
  baseURL: normalizeBaseURL(API_BASE_URL),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add auth token to requests (except health checks)
api.interceptors.request.use((config) => {
  // Ensure URL is properly formatted
  if (config.url && !config.url.startsWith('/')) {
    config.url = '/' + config.url;
  }
  
  // Skip adding token for health check endpoints
  if (config.url?.includes('/health')) {
    return config;
  }
  
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  }
  
  return config;
});

// Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Only redirect if it's not a health check or profile endpoint
      // Profile endpoints return 200 for admin users, so this shouldn't trigger
      const url = error.config?.url || '';
      if (!url.includes('/health') && !url.includes('/profile')) {
        // Check if error message indicates actual token expiration
        const errorMsg = error.response?.data?.error || '';
        if (errorMsg.includes('token') || errorMsg.includes('expired') || errorMsg.includes('Invalid')) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          // Don't redirect if we're already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

