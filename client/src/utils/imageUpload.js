/**
 * Shared Image Upload Utility
 * Provides consistent image upload functionality across all admin components
 */
import axios from 'axios';

/**
 * Get the resolved API base URL
 * In production, use relative paths (Vercel rewrites will proxy)
 * In development, use VITE_API_BASE_URL if set
 * @returns {string}
 */
const getApiBase = () => {
  // In production, always use relative paths so Vercel rewrites work
  if (!import.meta.env.DEV) {
    return ''; // Relative path - Vercel will proxy
  }
  // In development, use the configured API URL
  return String(axios.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
};

/**
 * Resolve media URL to full URL
 * @param {string} rawUrl - The raw URL from the database
 * @returns {string} Resolved URL
 */
export const resolveMediaUrl = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return '';

  // Data URLs and full URLs are returned as-is
  if (/^data:/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url;

  // Protocol-relative URLs
  if (url.startsWith('//')) return `${window.location.protocol}${url}`;

  const base = getApiBase();
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

/**
 * Upload an image file to the server
 * @param {File} file - The image file to upload
 * @param {string} token - Admin authentication token
 * @returns {Promise<{fileUrl: string, fileType: string}>}
 */
export const uploadImage = async (file, token) => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file (jpg, png, webp, etc)');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 10MB');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post('/api/admin/content/upload', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.data?.fileUrl) {
    throw new Error('Upload succeeded but no file URL was returned');
  }

  return {
    fileUrl: response.data.fileUrl,
    fileType: response.data.fileType || 'image',
  };
};

/**
 * Convert a file to base64 data URL
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 data URL
 */
export const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Add cache busting parameter to URL
 * @param {string} url - The URL to add cache busting to
 * @returns {string} URL with cache busting parameter
 */
export const withCacheBust = (url) => {
  const value = String(url || '').trim();
  if (!value) return '';
  const joiner = value.includes('?') ? '&' : '?';
  return `${value}${joiner}v=${Date.now()}`;
};

/**
 * Handle image load error by trying fallback URLs
 * @param {HTMLImageElement} img - The image element
 * @param {string} rawUrl - The original raw URL
 */
export const handleImageError = (img, rawUrl) => {
  const candidates = resolveMediaCandidates(rawUrl);
  const currentIndex = parseInt(img.getAttribute('data-fallback-index') || '0', 10);
  
  if (currentIndex + 1 < candidates.length) {
    img.setAttribute('data-fallback-index', String(currentIndex + 1));
    img.src = candidates[currentIndex + 1];
  }
};

/**
 * Get all possible URL variants for a media URL
 * @param {string} rawUrl - The raw URL
 * @returns {string[]} Array of possible URLs to try
 */
export const resolveMediaCandidates = (rawUrl) => {
  const original = String(rawUrl || '').trim();
  if (!original) return [];

  const normalized = original.replace(/\\/g, '/');
  // In production, use relative paths
  const apiBase = import.meta.env.DEV 
    ? String(axios.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
    : '';
  const origin = window.location.origin.replace(/\/+$/, '');
  const candidates = [];

  const pushUnique = (value) => {
    const next = String(value || '').trim();
    if (next && !candidates.includes(next)) candidates.push(next);
  };

  // Data URL
  if (/^data:/i.test(normalized)) {
    pushUnique(normalized);
    return candidates;
  }

  // Full URL
  if (/^https?:\/\//i.test(normalized)) {
    pushUnique(normalized);
    try {
      const parsed = new URL(normalized);
      if (parsed.pathname.includes('/api/uploads/')) {
        pushUnique(`${origin}${parsed.pathname}`);
        pushUnique(`${apiBase}${parsed.pathname}`);
      }
    } catch {
      // ignore parse failures
    }
    return candidates;
  }

  // Protocol-relative URL
  if (normalized.startsWith('//')) {
    pushUnique(`${window.location.protocol}${normalized}`);
    return candidates;
  }

  // Absolute path
  if (normalized.startsWith('/')) {
    pushUnique(`${origin}${normalized}`);
    pushUnique(`${apiBase}${normalized}`);
    if (!normalized.startsWith('/api/')) {
      pushUnique(`${origin}/api${normalized}`);
      pushUnique(`${apiBase}/api${normalized}`);
    }
    pushUnique(normalized);
  } else {
    // Relative path
    pushUnique(`${origin}/${normalized}`);
    pushUnique(`${apiBase}/${normalized}`);
    pushUnique(normalized);
  }

  // Extract uploads path
  const uploadMatch = normalized.match(/(?:^|\/)(?:api\/)?uploads\/([^/?#]+)/i);
  if (uploadMatch?.[1]) {
    const fileName = uploadMatch[1];
    pushUnique(`${origin}/api/uploads/${fileName}`);
    pushUnique(`${apiBase}/api/uploads/${fileName}`);
  }

  return candidates;
};

export default {
  uploadImage,
  fileToDataUrl,
  withCacheBust,
  resolveMediaUrl,
  handleImageError,
  resolveMediaCandidates,
};
