'use client'
import React, { createContext, useContext, useState, useEffect, useCallback, JSX } from 'react';
import { User, userApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }):JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await userApi.getUser();
    if (!error && data) {
      setUser(data);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await userApi.signIn({ email, password });
    if (error) {
      return { error };
    }
    if (data) {
      setUser(data);
    }
    return {};
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { data, error } = await userApi.signUp({ name, email, password });
    if (error) {
      return { error };
    }
    if (data) {
      setUser(data);
    }
    return {};
  };

  const signOut = async () => {
    await userApi.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
