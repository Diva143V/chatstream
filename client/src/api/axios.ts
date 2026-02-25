import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// In production (Vercel), VITE_API_URL is set to the Render backend URL.
// In development, it falls back to '/api' which is proxied by Vite to localhost:3001.
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ─── Request Interceptor: attach JWT ─────────────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: handle 401 ────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: string }>) => {
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
