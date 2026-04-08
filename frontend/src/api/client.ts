// src/api/client.ts
import axios from 'axios';
import { store } from '../store/store';
import { API_BASE_URL } from '../config/api';
import { clearStoredToken, getStoredToken } from '../utils/auth';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Auth Token and Tenant ID dynamically
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  // Get active tenant directly from Redux store
  const state = store.getState();
  const activeTenantId = state.kanban.activeTenant?.id;

  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if ('Authorization' in config.headers) {
    delete config.headers.Authorization;
  }

  if (activeTenantId) {
    config.headers['x-tenant-id'] = activeTenantId;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.response?.data?.details ||
      '';

    const authFailure =
      status === 401 || (status === 403 && /token|expired|authentication/i.test(String(message)));

    if (authFailure) {
      clearStoredToken();

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
