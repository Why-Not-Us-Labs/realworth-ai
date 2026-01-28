'use client';

import React, { useState, useEffect } from 'react';
import { trackUpgradeClick, trackCheckoutStart } from '@/lib/analytics';
import { isCapacitorApp } from '@/lib/utils';
import { useStoreKit, STOREKIT_PRODUCTS } from '@/hooks/useStoreKit';
import {
  SparklesIcon,
  GemIcon,
  ShieldIcon,
  CheckIcon,
  BoltIcon
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

type BillingInterval = 'monthly' | 'annual';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName: string;
  feature?: string;
  onAccessCodeSuccess?: () => void;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName,
  feature,
  onAccessCodeSuccess,
}: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSingleLoading, setIsSingleLoading] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeError, setAccessCodeError] = useState('');
  const [accessCodeSuccess, setAccessCodeSuccess] = useState('');
  const [mounted, setMounted] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('annual');
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [iapError, setIapError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [storeKitTimedOut, setStoreKitTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // StoreKit hook for native iOS IAP
  const storeKit = useStoreKit();

  // Ensure client-side only rendering
  useEffect(() => {
    setMounted(true);
    setIsNativeApp(isCapacitorApp());
  }, []);

  // Failsafe: Force StoreKit loading to end after 5 seconds
  useEffect(() => {
    if (isOpen && isNativeApp && storeKit.isLoading && !storeKitTimedOut) {
      const timer = setTimeout(() => {
        console.warn('[UpgradeModal] StoreKit loading timed out, falling back to Stripe');
        setStoreKitTimedOut(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isNativeApp, storeKit.isLoading, storeKitTimedOut]);

  // Track when upgrade modal is opened
  useEffect(() => {
    if (isOpen && mounted) {
      trackUpgradeClick(feature || 'modal');
    }
  }, [isOpen, feature, mounted]);

  if (!isOpen || !mounted) return null;

  // Handle IAP purchase for native iOS app
  const handleIAPPurchase = async () => {
    setIsLoading(true);
    setIapError(null);
    trackCheckoutStart();

    try {
      const productId = billingInterval === 'annual'
        ? STOREKIT_PRODUCTS.ANNUAL
        : STOREKIT_PRODUCTS.MONTHLY;

      const result = await storeKit.purchase(productId);

      if (result.success) {
        window.location.reload();
      } else if (result.error === 'Purchase cancelled') {
        setIsLoading(false);
      } else {
        setIapError(result.error || 'Purchase failed. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('IAP error:', error);
      setIapError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Restore previous purchases
  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    setIapError(null);

    try {
      const result = await storeKit.restorePurchases();

      if (result.success) {
        window.location.reload();
      } else {
        setIapError(result.error || 'No purchases to restore.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      setIapError('Failed to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle single appraisal purchase ($1.99) - redirects to Stripe Checkout
  const handleSinglePurchase = async () => {
    setIsSingleLoading(true);
    setError(null);
    trackCheckoutStart();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Please sign in to continue');
        setIsSingleLoading(false);
        return;
      }

      const response = await fetch('/api/stripe/pay-per-appraisal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to start checkout');
        setIsSingleLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      setError('Failed to start checkout. Please try again.');
      setIsSingleLoading(false);
    }
  };

  // Handle Stripe checkout for subscription
  const handleStripeCheckout = async () => {
    setIsLoading(true);
    setError(null);
    trackCheckoutStart();
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userEmail, userName, billingInterval }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Failed to create checkout session');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      setError('Failed to start checkout');
      setIsLoading(false);
    }
  };

  // Choose the appropriate purchase handler
  const handleUpgrade = async () => {
    if (isNativeApp && storeKit.isAvailable) {
      await handleIAPPurchase();
    } else {
      await handleStripeCheckout();
    }
  };

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setIsLoading(true);
    setAccessCodeError('');
    setAccessCodeSuccess('');

    try {
      const response = await fetch('/api/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode, userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAccessCodeSuccess(data.message);
        setTimeout(() => {
          onAccessCodeSuccess?.();
          onClose();
          window.location.reload();
        }, 1500);
      } else {
        setAccessCodeError(data.error || 'Invalid access code');
      }
    } catch (error) {
      console.error('Error redeeming access code:', error);
      setAccessCodeError('Failed to redeem code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in duration-200 flex flex-col">
        {/* Hero Section - Compact */}
        <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 px-4 py-3 text-white relative overflow-hidden flex-shrink-0">
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <GemIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Unlock Your Fortune</h2>
              <p className="text-teal-100 text-xs">
                {feature ? `${feature} is a Pro feature` : 'Get your appraisal now'}
              </p>
            </div>
          </div>
        </div>

        {/* Content - with extra bottom padding for nav */}
        <div className="p-4 pb-24 overflow-y-auto flex-1">
          {/* Error message */}
          {(error || iapError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-600 mb-3">
              {error || iapError}
            </div>
          )}

          {/* Single Appraisal - Primary CTA (hide on iOS native) */}
          {!isNativeApp && (
            <div className="mb-4">
              <Button
                onClick={handleSinglePurchase}
                disabled={isSingleLoading}
                size="lg"
                className="w-full text-base py-6"
              >
                {isSingleLoading ? (
                  'Redirecting to checkout...'
                ) : (
                  <>
                    <BoltIcon className="w-5 h-5 mr-2" />
                    $1.99 - Appraise This Item
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-slate-400 mt-2">
                One-time payment for 1 appraisal credit
              </p>
            </div>
          )}

          {/* Divider */}
          {!isNativeApp && (
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or go unlimited</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          )}

          {/* Subscription Option */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <SparklesIcon className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-slate-900">RealWorth Pro</span>
              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">Best Value</span>
            </div>

            {/* Benefits - compact */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <CheckIcon className="w-3.5 h-3.5 text-teal-500" />
                <span>Unlimited appraisals</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <CheckIcon className="w-3.5 h-3.5 text-teal-500" />
                <span>AI Expert analysis</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <CheckIcon className="w-3.5 h-3.5 text-teal-500" />
                <span>Collections</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <CheckIcon className="w-3.5 h-3.5 text-teal-500" />
                <span>Priority support</span>
              </div>
            </div>

            {/* Billing Toggle */}
            <div className="flex bg-white rounded-lg p-1 mb-3 border border-slate-200">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-teal-500 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                  billingInterval === 'annual'
                    ? 'bg-teal-500 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Annual
                <span className="ml-1 text-emerald-300 font-semibold">-37%</span>
              </button>
            </div>

            {/* Price */}
            <div className="text-center mb-3">
              {billingInterval === 'monthly' ? (
                <div className="text-xl font-bold text-slate-900">
                  $19.99<span className="text-sm font-normal text-slate-500">/month</span>
                </div>
              ) : (
                <>
                  <div className="text-xl font-bold text-slate-900">
                    $149.99<span className="text-sm font-normal text-slate-500">/year</span>
                  </div>
                  <p className="text-xs text-emerald-600 font-medium">Save $90/year</p>
                </>
              )}
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={isLoading || isRestoring || (isNativeApp && storeKit.isLoading && !storeKitTimedOut)}
              variant="outline"
              className="w-full border-teal-500 text-teal-600 hover:bg-teal-50"
            >
              {isLoading ? (
                'Processing...'
              ) : (isNativeApp && storeKit.isLoading && !storeKitTimedOut) ? (
                'Loading...'
              ) : (
                'Start Pro Subscription'
              )}
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-3 text-xs text-slate-400 mt-3">
            <span className="flex items-center gap-1">
              <CheckIcon className="w-3 h-3" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-1">
              <ShieldIcon className="w-3 h-3" />
              Secure checkout
            </span>
          </div>

          {/* Terms and Privacy - Required by App Store */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-3">
            <a href="/terms" target="_blank" className="hover:text-teal-600 underline">
              Terms of Use
            </a>
            <span>•</span>
            <a href="/privacy" target="_blank" className="hover:text-teal-600 underline">
              Privacy Policy
            </a>
          </div>

          {/* Restore Purchases - only in native iOS app */}
          {isNativeApp && storeKit.isAvailable && (
            <button
              onClick={handleRestorePurchases}
              disabled={isRestoring || isLoading}
              className="w-full text-xs text-teal-600 hover:text-teal-700 transition-colors disabled:opacity-50 mt-3"
            >
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </button>
          )}

          {/* Access Code & Maybe Later */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {!isNativeApp && !showAccessCode ? (
              <>
                <button
                  onClick={() => setShowAccessCode(true)}
                  className="text-xs text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Have a code?
                </button>
                <span className="text-slate-300">|</span>
              </>
            ) : null}
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Maybe Later
            </button>
          </div>

          {/* Access Code Form */}
          {!isNativeApp && showAccessCode && (
            <form onSubmit={handleAccessCodeSubmit} className="space-y-2 mt-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="Access code"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent uppercase tracking-wider"
                  disabled={isLoading}
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="characters"
                />
                <button
                  type="submit"
                  disabled={isLoading || !accessCode.trim()}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 active:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? '...' : 'Redeem'}
                </button>
              </div>
              {accessCodeError && (
                <p className="text-xs text-red-500">{accessCodeError}</p>
              )}
              {accessCodeSuccess && (
                <p className="text-xs text-green-600">{accessCodeSuccess}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
