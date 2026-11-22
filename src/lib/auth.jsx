import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    api.me()
      .then((current) => active && setUser(current))
      .catch(() => active && setUser(null))
      .finally(() => active && setReady(true));
    return () => { active = false; };
  }, []);

  const value = {
    user,
    ready,
    signin: async (values) => {
      const current = await api.login(values);
      setUser(current);
      return current;
    },
    signup: async (values) => {
      const current = await api.signup(values);
      setUser(current);
      return current;
    },
    signout: async () => {
      await api.logout();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
