import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

// Determine base URL:
// In production (e.g. Vercel), VITE_API_URL will point to Heroku (e.g. https://cropsight.herokuapp.com)
// In local development, VITE_API_URL is unset, so we use '/api/v1' which Vite proxies to localhost:8000
const rawBaseUrl = import.meta.env.VITE_API_URL;
let resolvedBaseUrl = '/api/v1';

if (rawBaseUrl && typeof rawBaseUrl === 'string' && rawBaseUrl.trim() !== '') {
  const trimmed = rawBaseUrl.trim().replace(/\/+$/, '');
  resolvedBaseUrl = trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

export const api = axios.create({
  baseURL: resolvedBaseUrl,
  withCredentials: false,
  timeout: 30000,
});

export function getUserErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred.'): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 413) return 'That photo is too large. Try a smaller one.';
    if (status === 415) return 'Use a JPG, PNG or WebP photo.';
    if (status === 422) return "We couldn't read that image. Try another photo.";
    if (status === 429) return 'Too many scans. Wait a minute and try again.';
    if (status === 503) return 'The model is still starting. Try again in a few seconds.';
    if (status && status >= 500 && status < 600) return 'Something went wrong on our side. Try again.';
    if (!error.response && error.code === 'ERR_NETWORK') return "Can't reach the server. Check your connection.";
    if (!error.response) return "Can't reach the server. Check your connection.";
  }
  return fallback;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    // Toast only for 429, 5xx, and network errors. 413/415/422/503 are shown inline by the UI.
    if (!error.response || status === 429 || (status && status >= 500 && status < 600)) {
      toast.error(getUserErrorMessage(error));
    }
    return Promise.reject(error);
  }
);
