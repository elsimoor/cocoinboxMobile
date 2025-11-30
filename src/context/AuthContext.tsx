import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '@/api/client';

export interface User {
  id: string;
  email: string;
  name?: string;
  is_pro?: boolean;
  subscriptionStatus?: string;
  proGraceUntil?: string;
}

interface AuthContextShape {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { email: string; password: string; name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('token');
        if (stored) {
          setToken(stored);
          await loadProfile(stored);
        }
      } catch (err) {
        console.warn('Failed to restore session', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadProfile = async (authToken: string) => {
    const me = await apiRequest<User>('/api/auth/me', { token: authToken });
    setUser(me);
  };

  const signIn = async (email: string, password: string) => {
    const res = await apiRequest<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem('token', res.token);
    setToken(res.token);
    await loadProfile(res.token);
  };

  const signUp = async ({ email, password, name }: { email: string; password: string; name?: string }) => {
    await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    await signIn(email, password);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      await loadProfile(token);
    } catch (err) {
      console.warn('Failed to refresh profile', err);
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
