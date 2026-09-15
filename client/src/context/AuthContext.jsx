import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mota_user')) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('mota_token')));

  useEffect(() => {
    if (!localStorage.getItem('mota_token')) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('mota_user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('mota_token');
        localStorage.removeItem('mota_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback((token, nextUser) => {
    localStorage.setItem('mota_token', token);
    localStorage.setItem('mota_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await api.post('/auth/register', payload);
      persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('mota_token');
    localStorage.removeItem('mota_user');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      setUser,
      isApplicant: user?.role === 'applicant',
      isOfficer: user?.role === 'officer',
      isAdmin: user?.role === 'admin',
      isStaff: user?.role === 'officer' || user?.role === 'admin',
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
