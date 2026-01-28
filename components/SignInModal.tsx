'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { XIcon, GoogleIcon, AppleIcon, EmailIcon, SpinnerIcon } from './icons';
import { AuthProvider, authService } from '@/services/authService';
import { isCapacitorApp } from '@/lib/utils';

type AuthStep = 'providers' | 'email_input' | 'email_sent';

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
  const [email, setEmail] = useState('');
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
    setEmail('');
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
    if (step === 'email_input' && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [step]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    const result = await authService.sendMagicLink(email.trim());

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setStep('email_sent');
    }
  };

  const handleResendMagicLink = async () => {
    setIsLoading(true);
    setError(null);

    const result = await authService.sendMagicLink(email.trim());

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
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
                onClick={() => setStep('email_input')}
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

        {/* Email Input Step */}
        {step === 'email_input' && (
          <>
            {/* Back button & Header */}
            <div className="mb-6">
              <button
                onClick={() => {
                  setStep('providers');
                  setError(null);
                  setEmail('');
                }}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium mb-3"
              >
                &larr; Back
              </button>
              <h2 className="text-xl font-bold text-slate-800">
                Sign in with email
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                We&apos;ll send you a magic link to sign in
              </p>
            </div>

            <form onSubmit={handleSendMagicLink}>
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

              {error && (
                <p className="text-red-500 text-sm mt-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 active:bg-teal-700 transition-colors touch-manipulation min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <SpinnerIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="font-medium">Send Magic Link</span>
                )}
              </button>
            </form>
          </>
        )}

        {/* Email Sent Confirmation */}
        {step === 'email_sent' && (
          <>
            {/* Header with email icon */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <EmailIcon className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                Check your email
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                We sent a magic link to
              </p>
              <p className="text-sm font-medium text-slate-700 mt-1">
                {email}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-600 text-center">
                Click the link in the email to sign in automatically. The link will expire in 1 hour.
              </p>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mb-3">{error}</p>
            )}

            <button
              onClick={handleResendMagicLink}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-teal-600 hover:bg-teal-50 rounded-xl transition-colors touch-manipulation disabled:opacity-50"
            >
              {isLoading ? (
                <SpinnerIcon className="w-5 h-5 animate-spin" />
              ) : (
                <span className="font-medium">Resend magic link</span>
              )}
            </button>

            <button
              onClick={() => {
                setStep('email_input');
                setError(null);
              }}
              className="w-full mt-2 text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              Use a different email
            </button>

            <p className="text-xs text-slate-400 text-center mt-4">
              Check your spam folder if you don&apos;t see the email
            </p>
          </>
        )}
      </div>
    </div>
  );
};
