/**
 * API Configuration Utility
 * Handles dynamic API URL resolution for production vs development environments
 * 
 * IMPORTANT: API returns the base URL WITHOUT /api suffix.
 * All components must include /api/ in their endpoint paths.
 * Example: `${API}/api/auth/login`
 */

// Production domains that should use relative URLs
const PRODUCTION_DOMAINS = ['evolution-pro.it', 'app.evolution-pro.it'];

/**
 * Get the base API URL (WITHOUT /api suffix)
 * - In production (evolution-pro.it domain): returns empty string (relative)
 * - In development/preview: returns REACT_APP_BACKEND_URL
 */
export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (PRODUCTION_DOMAINS.some(domain => hostname.includes(domain))) {
      return '';
    }
  }
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  return backendUrl || '';
};

/**
 * Get the base URL without /api suffix (for webhooks, file URLs, etc.)
 */
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (PRODUCTION_DOMAINS.some(domain => hostname.includes(domain))) {
      return window.location.origin;
    }
  }
  return process.env.REACT_APP_BACKEND_URL || '';
};

// Export as default API for convenience
export const API = getApiUrl();
export const API_URL = getBaseUrl();
