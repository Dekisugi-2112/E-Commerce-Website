'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: 'customer' | 'admin';
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, phone?: string) => Promise<string>;
  logout: () => void;
  updateProfileState: (data: { full_name: string; phone?: string; avatar_url?: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check localStorage on mount
    const savedToken = localStorage.getItem('shofy_token');
    const savedUser = localStorage.getItem('shofy_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('shofy_token');
        localStorage.removeItem('shofy_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetchApi<{
        success: boolean;
        access_token: string;
        user: UserProfile;
        message: string;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.access_token && res.user) {
        setToken(res.access_token);
        setUser(res.user);
        localStorage.setItem('shofy_token', res.access_token);
        localStorage.setItem('shofy_user', JSON.stringify(res.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, full_name: string, phone?: string): Promise<string> => {
    setIsLoading(true);
    try {
      const res = await fetchApi<{
        success: boolean;
        message: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name, phone }),
      });

      return res.message || 'Đăng ký tài khoản thành công!';
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('shofy_token');
    localStorage.removeItem('shofy_user');
  };

  const updateProfileState = (data: { full_name: string; phone?: string; avatar_url?: string }) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('shofy_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateProfileState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
