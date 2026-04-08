const parseBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
};

const normalizeToken = (value: string | null) => {
  if (!value) return null;

  const trimmed = value.trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '');
  return trimmed || null;
};

interface TokenPayload {
  id?: string;
  email?: string;
  exp?: number;
}

export interface TokenUser {
  id?: string;
  email?: string;
}

const decodeTokenPayload = (token: string): TokenPayload | null => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(parseBase64Url(payload));
  } catch {
    return null;
  }
};

export const clearStoredToken = () => {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('token');
};

export const setStoredToken = (token: string) => {
  const normalized = normalizeToken(token);
  if (!normalized) {
    clearStoredToken();
    return;
  }

  localStorage.setItem('jwt_token', normalized);
  localStorage.removeItem('token');
};

export const getStoredToken = () => {
  const normalized = normalizeToken(localStorage.getItem('jwt_token') || localStorage.getItem('token'));
  if (!normalized) return null;
  return normalized;
};

export const isTokenExpired = (token: string) => {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
};

export const hasValidStoredToken = () => {
  const token = getStoredToken();
  if (!token) return false;
  return !isTokenExpired(token);
};

export const getUserFromToken = (): TokenUser | null => {
  const token = getStoredToken();
  if (!token || isTokenExpired(token)) return null;

  const payload = decodeTokenPayload(token);
  if (!payload) return null;

  return {
    id: payload.id,
    email: payload.email,
  };
};
