import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('supstar_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('supstar_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('supstar_token', data.token);
    setUser(data.user);
  }

  async function register(email, password, displayName) {
    const { data } = await api.post('/auth/register', { email, password, displayName });
    localStorage.setItem('supstar_token', data.token);
    setUser(data.user);
  }

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  const acceptToken = useCallback(async (token) => {
    localStorage.setItem('supstar_token', token);
    try { return await refreshUser(); } catch (error) { localStorage.removeItem('supstar_token'); throw error; }
  }, [refreshUser]);

  function logout() {
    localStorage.removeItem('supstar_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, acceptToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
