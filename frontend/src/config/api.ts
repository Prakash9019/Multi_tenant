const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const fallbackApiUrl = import.meta.env.DEV ? 'https://multi-tenant-tey5.vercel.app/api/v1' : '/api/v1';

if (!configuredApiUrl && import.meta.env.PROD) {
  console.error(
    'VITE_API_URL is not configured. Falling back to same-origin /api/v1. ' +
      'Set VITE_API_URL in Vercel when frontend and backend are deployed separately.'
  );
}

export const API_BASE_URL = configuredApiUrl || fallbackApiUrl;

export const SOCKET_SERVER_URL = (() => {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(API_BASE_URL, base);
  return `${url.protocol}//${url.host}`;
})();
