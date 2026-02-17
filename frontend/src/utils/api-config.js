/**
 * API Configuration Utility
 * Handles dynamic API URL resolution for production vs development environments
 */

// Production domains that should use relative URLs
const PRODUCTION_DOMAINS = ['evolution-pro.it', 'app.evolution-pro.it'];

/**
 * Get the base API URL
 * - In production (evolution-pro.it domain): uses relative /api
 * - In development: uses REACT_APP_BACKEND_URL environment variable
 */
export const getApiUrl = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If we're on a production domain, use relative /api
    if (PRODUCTION_DOMAINS.some(domain => hostname.includes(domain))) {
      return '/api';
    }
  }
  
  // Use the configured backend URL for development/preview
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  return backendUrl ? `${backendUrl}/api` : '/api';
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
