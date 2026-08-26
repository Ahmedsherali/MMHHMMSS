import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('mhms_admin');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('mhms_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setAdmin(res.data.admin);
            localStorage.setItem('mhms_admin', JSON.stringify(res.data.admin));
          }
        } catch (err) {
          console.error('Session verification failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    };
    verifyAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      setToken(res.data.token);
      setAdmin(res.data.admin);
      localStorage.setItem('mhms_token', res.data.token);
      localStorage.setItem('mhms_admin', JSON.stringify(res.data.admin));
    }
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('mhms_token');
    localStorage.removeItem('mhms_admin');
  };

  return (
    <AuthContext.Provider value={{ admin, token, isAuthenticated: !!token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
