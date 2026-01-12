'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { XIcon, GoogleIcon, AppleIcon, EmailIcon, SpinnerIcon } from './icons';
import { AuthProvider, authService } from '@/services/authService';
import { isCapacitorApp } from '@/lib/utils';

type AuthStep = 'providers' | 'email_form';
type EmailMode = 'sign_in' | 'sign_up';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (provider: AuthProvider) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSelectProvider,
}) => {
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [step, setStep] = useState<AuthStep>('providers');
  const [emailMode, setEmailMode] = useState<EmailMode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleClose = useCallback(() => {
    setStep('providers');
    setEmailMode('sign_in');
    setEmail('');
    setPassword('');
    setError(null);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    // Check if running in Capacitor native app
    setIsNativeApp(isCapacitorApp());
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  // Focus email input when showing email step
  useEffect(() => {
    if (step === 'email_form' && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [step]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);

    let result;
    if (emailMode === 'sign_up') {
      result = await authService.signUpWithEmail(email.trim(), password);
    } else {
      result = await authService.signInWithEmail(email.trim(), password);
    }

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.user) {
      handleClose();
      // Auth state change will be picked up by AuthContext
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors touch-manipulation"
          aria-label="Close"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* Provider Selection */}
        {step === 'providers' && (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Sign in to continue</h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose your preferred sign-in method
              </p>
            </div>

            {/* Provider buttons */}
            <div className="space-y-3">
              {/* Google - hidden in native app (WebView OAuth blocked by Google) */}
              {!isNativeApp && (
                <button
                  onClick={() => onSelectProvider('google')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation min-h-[48px]"
                >
                  <GoogleIcon className="w-5 h-5" />
                  <span className="font-medium text-slate-700">Continue with Google</span>
                </button>
              )}

              {/* Apple */}
              <button
                onClick={() => onSelectProvider('apple')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-black text-white rounded-xl hover:bg-slate-800 active:bg-slate-900 transition-colors touch-manipulation min-h-[48px]"
              >
                <AppleIcon className="w-5 h-5" />
                <span className="font-medium">Continue with Apple</span>
              </button>

              {/* Email */}
              <button
                onClick={() => setStep('email_form')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation min-h-[48px]"
              >
                <EmailIcon className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Continue with Email</span>
              </button>
            </div>

            {/* Footer */}
            <p className="text-xs text-slate-400 text-center mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </>
        )}

        {/* Email Form */}
        {step === 'email_form' && (
          <>
            {/* Back button & Header */}
            <div className="mb-6">
              <button
                onClick={() => {
                  setStep('providers');
                  setError(null);
                  setPassword('');
                }}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium mb-3"
              >
                &larr; Back
              </button>
              <h2 className="text-xl font-bold text-slate-800">
                {emailMode === 'sign_in' ? 'Sign in with email' : 'Create an account'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {emailMode === 'sign_in'
                  ? 'Enter your email and password'
                  : 'Enter your email and create a password'}
              </p>
            </div>

            <form onSubmit={handleEmailSubmit}>
              <div className="space-y-3">
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
                  disabled={isLoading}
                  autoComplete="email"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
                  disabled={isLoading}
                  autoComplete={emailMode === 'sign_in' ? 'current-password' : 'new-password'}
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm mt-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 active:bg-teal-700 transition-colors touch-manipulation min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <SpinnerIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="font-medium">
                    {emailMode === 'sign_in' ? 'Sign In' : 'Create Account'}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmailMode(emailMode === 'sign_in' ? 'sign_up' : 'sign_in');
                  setError(null);
                }}
                disabled={isLoading}
                className="w-full mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
              >
                {emailMode === 'sign_in'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </form>

            {emailMode === 'sign_up' && (
              <p className="text-xs text-slate-400 text-center mt-4">
                Password must be 8+ characters with uppercase, lowercase, number, and symbol
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
