import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('supstar_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si le token expire, on nettoie et on renvoie vers /login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('supstar_token');
    }
    return Promise.reject(err);
  }
);

export default api;
