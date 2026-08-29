import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({ baseURL: API_BASE_URL });

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
