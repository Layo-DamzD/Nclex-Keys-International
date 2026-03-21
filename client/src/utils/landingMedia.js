import axios from 'axios';

export const getResolvedApiBase = () =>
  String(axios.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export const resolveMediaUrl = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (/^data:/i.test(url) || /^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `${window.location.protocol}${url}`;

  const base = getResolvedApiBase();
  if (url.startsWith('/api/')) return base ? `${base}${url}` : url;
  if (url.startsWith('/')) return base ? `${base}${url}` : url;
  return base ? `${base}/${url}` : url;
};

export const withCacheBust = (rawUrl) => {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  const joiner = value.includes('?') ? '&' : '?';
  return `${value}${joiner}v=${Date.now()}`;
};
