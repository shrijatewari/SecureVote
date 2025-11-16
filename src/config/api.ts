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
  timeout: 120000, // 120 second (2 minute) timeout for long-running operations
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
  (response) => {
    // Always allow 200 responses through
    return response;
  },
  (error) => {
    // Get full URL from config (handles both relative and absolute)
    const configUrl = error.config?.url || '';
    const baseURL = error.config?.baseURL || '';
    const fullUrl = baseURL + configUrl;
    const status = error.response?.status;
    
    // CRITICAL: NEVER show session expired for profile/completion endpoints
    // Check URL in multiple ways to catch all variations
    const urlLower = fullUrl.toLowerCase();
    const isProfileEndpoint = urlLower.includes('/profile') || 
                             urlLower.includes('/completion') ||
                             configUrl.includes('/profile') ||
                             configUrl.includes('/completion');
    const isHealthEndpoint = urlLower.includes('/health') || configUrl.includes('/health');
    
    // ALWAYS skip session expired alert for profile/completion/health endpoints
    if (isHealthEndpoint || isProfileEndpoint) {
      // Silently reject - these endpoints return 200 with null for admin users
      return Promise.reject(error);
    }
    
    // Skip handling if status is 200
    if (status === 200) {
      return Promise.reject(error);
    }
    
    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      // Check if alert already exists
      if (document.querySelector('.timeout-alert')) {
        return Promise.reject(error);
      }
      
      const alert = document.createElement('div');
      alert.className = 'timeout-alert';
      alert.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span>⏱️</span>
          <div>
            <div style="font-weight: bold; margin-bottom: 4px;">Request Timeout</div>
            <div style="font-size: 14px;">The request is taking longer than expected. Please try again or check your connection.</div>
          </div>
        </div>
      `;
      alert.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f59e0b; color: white; padding: 16px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px;';
      document.body.appendChild(alert);
      setTimeout(() => {
        alert.remove();
      }, 5000);
      
      return Promise.reject(error);
    }
    
    // Only handle 401/403 for actual authentication errors
    if (status === 401 || status === 403) {
      // Check if error message indicates actual token expiration
      const errorMsg = (error.response?.data?.error || '').toLowerCase();
      const isTokenError = errorMsg.includes('token') || 
                          errorMsg.includes('expired') || 
                          errorMsg.includes('invalid') || 
                          errorMsg.includes('unauthorized') ||
                          errorMsg.includes('access token required');
      
      // Only show session expired for actual token errors
      if (isTokenError) {
        // Additional safety check: Check if user is admin or on admin page
        const userData = localStorage.getItem('user_data');
        let isAdmin = false;
        try {
          if (userData) {
            const user = JSON.parse(userData);
            const role = (user.role || 'citizen').toLowerCase();
            isAdmin = role !== 'citizen';
          }
        } catch {
          // Ignore parsing errors
        }
        
        const isAdminPage = window.location.pathname.includes('/admin');
        
        // NEVER show session expired for admin users or on admin pages
        if (isAdminPage || isAdmin) {
          return Promise.reject(error);
        }
        
        // Check if alert already exists
        if (document.querySelector('.session-expired-alert')) {
          return Promise.reject(error);
        }
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        
        // Don't redirect if already on login page
        if (window.location.pathname !== '/login') {
          const alert = document.createElement('div');
          alert.className = 'session-expired-alert';
          alert.textContent = 'Your session has expired. Please log in again.';
          alert.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
          document.body.appendChild(alert);
          setTimeout(() => {
            alert.remove();
            window.location.href = '/login';
          }, 2000);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

