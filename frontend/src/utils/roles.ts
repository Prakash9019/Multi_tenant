import type { Role } from '../types';

export const isAdminRole = (role?: Role | null) =>
  role === 'ORG_ADMIN' || role === 'TENANT_ADMIN';

export const isOrgAdminRole = (role?: Role | null) => role === 'ORG_ADMIN';
