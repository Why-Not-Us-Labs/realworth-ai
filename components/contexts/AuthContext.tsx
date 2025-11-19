
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import { authService } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  isAuthLoading: boolean;
  signIn: () => Promise<User | null>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthLoading: true,
  signIn: async () => null,
  signOut: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setIsAuthLoading(false);
  }, []);

  const signIn = async (): Promise<User | null> => {
    setIsAuthLoading(true);
    try {
      const newUser = await authService.signInWithGoogle();
      setUser(newUser);
      return newUser;
    } catch (error) {
      console.error("Sign in failed", error);
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signOut = () => {
    authService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
