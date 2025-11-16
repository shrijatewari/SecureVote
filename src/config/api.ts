import axios from 'axios';

const resolveDefaultBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    // Ensure it ends with /api
    return envUrl.endsWith('/api') ? envUrl : (envUrl.endsWith('/') ? `${envUrl}api` : `${envUrl}/api`);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const apiPort = import.meta.env.VITE_API_PORT || '3000';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    const isVercel = hostname.includes('vercel.app');

    if (isLocalhost) {
      return `http://localhost:${apiPort}/api`;
    }

    if (isLanIp) {
      const preferredProtocol = protocol === 'https:' ? 'https' : 'http';
      return `${preferredProtocol}://${hostname}:${apiPort}/api`;
    }

    // For Vercel deployments, use the backend URL from env or default backend
    if (isVercel) {
      // If backend is deployed separately, use that URL
      // Otherwise, assume backend is at a known URL
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://your-backend-url.vercel.app';
      return `${backendUrl}/api`;
    }

    // Production fallback assumes a reverse proxy exposes /api on the same origin
    return `${protocol}//${hostname}${port ? `:${port}` : ''}/api`;
  }

  return 'http://localhost:3000/api';
};

const API_BASE_URL = resolveDefaultBaseUrl();

if (!import.meta.env.VITE_API_URL && typeof window !== 'undefined') {
  console.warn(
    `[api] VITE_API_URL not set. Falling back to derived base URL: ${API_BASE_URL}.`
  );
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
      // Only redirect if it's not a health check
      if (!error.config?.url?.includes('/health')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        // Don't redirect if we're already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

