import axios from 'axios';

/**
 * Get the resolved API base URL
 * In production, use relative paths (Vercel rewrites will proxy)
 * In development, use VITE_API_BASE_URL if set
 */
export const getResolvedApiBase = () => {
  // In production, always use relative paths so Vercel rewrites work
  if (!import.meta.env.DEV) {
    return ''; // Relative path - Vercel will proxy
  }
  // In development, use the configured API URL
  return String(axios.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
};

export const resolveMediaUrl = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return '';

  // Data URLs and full URLs are returned as-is
  if (/^data:/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url;

  // Protocol-relative URLs
  if (url.startsWith('//')) return `${window.location.protocol}${url}`;

  const base = getResolvedApiBase();
  const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';

  // For /api/ paths, try origin first (same-origin requests), then API base
  if (url.startsWith('/api/')) {
    // If we have an API base URL that's different from origin, use it
    if (base && base !== origin) return `${base}${url}`;
    // Otherwise use the current origin (works for same-origin deployments)
    return `${origin}${url}`;
  }

  // For other absolute paths
  if (url.startsWith('/')) {
    if (base && base !== origin) return `${base}${url}`;
    return `${origin}${url}`;
  }

  // Relative paths
  if (base && base !== origin) return `${base}/${url}`;
  return `${origin}/${url}`;
};

export const withCacheBust = (rawUrl) => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  const joiner = value.includes('?') ? '&' : '?';
  return `${value}${joiner}v=${Date.now()}`;
};
