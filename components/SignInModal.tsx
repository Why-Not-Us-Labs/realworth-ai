'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { XIcon, GoogleIcon, AppleIcon, EmailIcon, SpinnerIcon, ChevronRightIcon } from './icons';
import { AuthProvider, authService } from '@/services/authService';
import { isCapacitorApp } from '@/lib/utils';

type AuthStep = 'providers' | 'email_input' | 'otp_input';

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
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

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
    setOtpCode('');
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
    if (step === 'otp_input' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    const result = await authService.sendOtp(email.trim());

    setIsLoading(false);

    if (result.success) {
      setStep('otp_input');
    } else {
      setError(result.error || 'Failed to send code');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const user = await authService.verifyOtp(email.trim(), otpCode.trim());
      if (user) {
        handleClose();
        // Auth state change will be picked up by AuthContext
      } else {
        setError('Verification failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError(null);
    setOtpCode('');

    const result = await authService.sendOtp(email.trim());

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to resend code');
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

              {/* Email OTP */}
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

        {/* Email Input */}
        {step === 'email_input' && (
          <>
            {/* Back button & Header */}
            <div className="mb-6">
              <button
                onClick={() => {
                  setStep('providers');
                  setError(null);
                }}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium mb-3"
              >
                &larr; Back
              </button>
              <h2 className="text-xl font-bold text-slate-800">Enter your email</h2>
              <p className="text-sm text-slate-500 mt-1">
                We&apos;ll send you a 6-digit code to sign in
              </p>
            </div>

            <form onSubmit={handleSendOtp}>
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
                disabled={isLoading}
                autoComplete="email"
              />

              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 active:bg-teal-700 transition-colors touch-manipulation min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <SpinnerIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="font-medium">Send Code</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* OTP Input */}
        {step === 'otp_input' && (
          <>
            {/* Back button & Header */}
            <div className="mb-6">
              <button
                onClick={() => {
                  setStep('email_input');
                  setOtpCode('');
                  setError(null);
                }}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium mb-3"
              >
                &larr; Back
              </button>
              <h2 className="text-xl font-bold text-slate-800">Enter code</h2>
              <p className="text-sm text-slate-500 mt-1">
                We sent a 6-digit code to <span className="font-medium text-slate-700">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp}>
              <input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(value);
                }}
                placeholder="000000"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-800 placeholder:text-slate-400 text-center text-2xl tracking-[0.5em] font-mono"
                disabled={isLoading}
                autoComplete="one-time-code"
              />

              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 active:bg-teal-700 transition-colors touch-manipulation min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <SpinnerIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="font-medium">Verify & Sign In</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="w-full mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
              >
                Resend code
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
