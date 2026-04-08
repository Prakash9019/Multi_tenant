const parseBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
};

export interface TokenUser {
  id?: string;
  email?: string;
}

export const getStoredToken = () => localStorage.getItem('jwt_token');

export const getUserFromToken = (): TokenUser | null => {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(parseBase64Url(payload));
  } catch {
    return null;
  }
};
