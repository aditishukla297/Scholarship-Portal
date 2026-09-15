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

/**
 * Fetches an authenticated endpoint as a blob and saves it to disk.
 * A plain <a href> cannot be used for these: it would carry no Authorization
 * header, and in production it would resolve against the frontend origin
 * rather than the API.
 */
export async function downloadFile(path, filename) {
  const { data } = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Fetches an authenticated file and opens it in a new tab for viewing. */
export async function openFile(path) {
  const { data } = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const win = window.open(url, '_blank', 'noopener');
  // Revoke once the tab has had a chance to load the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!win) throw new Error('The browser blocked the pop-up. Allow pop-ups for this site to view the document.');
}

/** Normalises an axios error into a message suitable for display. */
export function apiError(error, fallback = 'The request could not be completed. Please try again.') {
  return error?.response?.data?.message || error?.message || fallback;
}

export default api;
