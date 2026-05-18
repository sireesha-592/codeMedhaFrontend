import axios from 'axios';

const isElectron = window.location.protocol === 'file:';

export const API_BASE = isElectron
  ? 'http://localhost:5000'
  : (process.env.REACT_APP_API_URL || 'https://codemedha-production.up.railway.app');

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;