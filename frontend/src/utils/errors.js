export function getApiError(error, fallback = 'Une erreur est survenue.') {
  const payload = error?.response?.data;
  if (typeof payload?.error?.message === 'string') return payload.error.message;
  if (typeof payload?.error === 'string') return payload.error;
  if (typeof payload?.message === 'string') return payload.message;
  if (typeof error?.message === 'string' && error.message) return error.message;
  return fallback;
}
