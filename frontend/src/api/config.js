const configuredApiUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, '');

export const API_BASE_URL = normalizedApiUrl === '/api' || normalizedApiUrl.endsWith('/api')
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;
