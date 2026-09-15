import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mota_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('mota_token');
      localStorage.removeItem('mota_user');
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login?expired=1');
    }
    return Promise.reject(error);
  }
);

/** Normalises an axios error into a message suitable for display. */
export function apiError(error, fallback = 'The request could not be completed. Please try again.') {
  return error?.response?.data?.message || error?.message || fallback;
}

export default api;
