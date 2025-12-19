'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import { authService, AuthProvider as AuthProviderType } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  isAuthLoading: boolean;
  signInWithProvider: (provider: AuthProviderType) => Promise<User | null>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthLoading: true,
  signInWithProvider: async () => null,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    authService.getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setIsAuthLoading(false);
      })
      .catch((error) => {
        console.error('Error checking auth session:', error);
        setUser(null);
        setIsAuthLoading(false);
      });

    // Listen for auth state changes
    const { data: authListener } = authService.onAuthStateChange((newUser) => {
      setUser(newUser);
      setIsAuthLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithProvider = async (provider: AuthProviderType): Promise<User | null> => {
    setIsAuthLoading(true);
    try {
      const newUser = await authService.signInWithProvider(provider);
      // Note: User will be set via onAuthStateChange callback after redirect
      return newUser;
    } catch (error) {
      console.error("Sign in failed", error);
      setIsAuthLoading(false);
      return null;
    }
  };

  const signOut = async () => {
    setIsAuthLoading(true);
    try {
      await authService.signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out failed", error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthLoading, signInWithProvider, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
