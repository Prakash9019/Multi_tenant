// src/api/client.ts
import axios from 'axios';
import { store } from '../store/store';
import { API_BASE_URL } from '../config/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Auth Token and Tenant ID dynamically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token'); // Or get from auth slice
  
  // Get active tenant directly from Redux store
  const state = store.getState();
  const activeTenantId = state.kanban.activeTenant?.id;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (activeTenantId) {
    config.headers['x-tenant-id'] = activeTenantId;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;
