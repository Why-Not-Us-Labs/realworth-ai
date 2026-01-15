'use client';

import React, { useState, useEffect } from 'react';
import { trackUpgradeClick, trackCheckoutStart } from '@/lib/analytics';
import { isCapacitorApp } from '@/lib/utils';
import { useStoreKit, STOREKIT_PRODUCTS } from '@/hooks/useStoreKit';
import {
  SparklesIcon,
  GemIcon,
  ShieldIcon,
  CameraIcon,
  GridIcon,
  BoltIcon,
  CheckIcon,
  ClockIcon,
  TrendingUpIcon
} from '@/components/icons';
import { Button } from '@/components/ui/button';

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
        // Purchase successful - reload to update subscription status
        window.location.reload();
      } else if (result.error === 'Purchase cancelled') {
        // User cancelled - just reset loading state
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
        // Restore successful - reload to update subscription status
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

  // Handle Stripe checkout for web
  const handleStripeCheckout = async () => {
    setIsLoading(true);
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
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout');
    } finally {
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
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] md:max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in duration-200 flex flex-col">
        {/* Hero Section - Compact on mobile and tablet */}
        <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 px-4 py-3 sm:py-4 md:py-3 text-white text-center relative overflow-hidden flex-shrink-0">
          {/* Background decoration - hidden on mobile for cleaner look */}
          <div className="absolute inset-0 opacity-10 hidden sm:block">
            <div className="absolute top-2 left-4 w-8 h-8 border-2 border-white rounded-full" />
            <div className="absolute top-8 right-8 w-4 h-4 bg-white rounded-full" />
            <div className="absolute bottom-4 left-12 w-6 h-6 border-2 border-white rotate-45" />
            <div className="absolute bottom-8 right-16 w-3 h-3 bg-white rounded-full" />
          </div>

          <div className="relative flex sm:flex-col md:flex-row items-center sm:items-center gap-3 sm:gap-0 md:gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-12 md:h-12 sm:mx-auto sm:mb-2 md:mb-0 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <GemIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-6 md:h-6 text-white" />
            </div>
            <div className="text-left sm:text-center md:text-left">
              <h2 className="text-xl sm:text-2xl md:text-xl font-bold">Unlock Your Fortune</h2>
              <p className="text-teal-100 text-xs sm:text-sm md:text-xs">
                {feature ? `${feature} is a Pro feature` : 'Discover what your items are really worth'}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="p-4 sm:p-5 md:p-4 overflow-y-auto flex-1">
          {/* Compelling stat - compact on tablet */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-2.5 sm:p-3 md:p-2.5 mb-3 sm:mb-4 md:mb-3">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <TrendingUpIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-slate-800 font-semibold text-xs">
                  1 in 4 households owns something worth $10,000+
                </p>
                <p className="text-slate-500 text-xs">
                  Most never find out. Don&apos;t leave money on the table.
                </p>
              </div>
            </div>
          </div>

          {/* Features - 2x2 grid, compact */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3">
            <FeatureCompact
              icon={<SparklesIcon className="w-3.5 h-3.5" />}
              text="AI Expert Analysis"
              highlight
            />
            <FeatureCompact
              icon={<BoltIcon className="w-3.5 h-3.5" />}
              text="Unlimited Appraisals"
            />
            <FeatureCompact
              icon={<CameraIcon className="w-3.5 h-3.5" />}
              text="Unlimited Photos"
            />
            <FeatureCompact
              icon={<GridIcon className="w-3.5 h-3.5" />}
              text="Collections"
            />
          </div>

          {/* Comparison callout */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 justify-center">
            <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Traditional appraisals: $100-500 &amp; take weeks</span>
          </div>

          {/* Billing Toggle */}
          <div className="mb-2.5">
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  billingInterval === 'annual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Annual
                <span className="ml-1 text-xs text-emerald-600 font-semibold">Save 37%</span>
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="text-center mb-3">
            {billingInterval === 'monthly' ? (
              <>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                  $19.99<span className="text-sm font-normal text-slate-500">/month</span>
                </div>
                <p className="text-xs text-slate-500">Cancel anytime</p>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                  $149.99<span className="text-sm font-normal text-slate-500">/year</span>
                </div>
                <p className="text-xs text-slate-500">
                  $12.50/month • <span className="text-emerald-600 font-medium">Save $90/year</span>
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {/* IAP Error Message */}
            {iapError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-600">
                {iapError}
              </div>
            )}

            <Button
              onClick={handleUpgrade}
              disabled={isLoading || isRestoring || (isNativeApp && storeKit.isLoading && !storeKitTimedOut)}
              size="default"
              className="w-full"
            >
              {isLoading ? (
                'Processing...'
              ) : (isNativeApp && storeKit.isLoading && !storeKitTimedOut) ? (
                'Loading...'
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  Start Finding Hidden Value
                </>
              )}
            </Button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CheckIcon className="w-3 h-3" />
                Cancel anytime
              </span>
              <span className="flex items-center gap-1">
                <ShieldIcon className="w-3 h-3" />
                Secure checkout
              </span>
            </div>

            {/* Restore Purchases - only in native iOS app */}
            {isNativeApp && storeKit.isAvailable && (
              <button
                onClick={handleRestorePurchases}
                disabled={isRestoring || isLoading}
                className="w-full text-xs text-teal-600 hover:text-teal-700 transition-colors disabled:opacity-50"
              >
                {isRestoring ? 'Restoring...' : 'Restore Purchases'}
              </button>
            )}

            {/* Access Code & Maybe Later - inline on mobile */}
            {/* Hide access code option in native iOS app (Apple requires IAP) */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {!isNativeApp && !showAccessCode ? (
                <>
                  <button
                    onClick={() => setShowAccessCode(true)}
                    className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    Have a code?
                  </button>
                  <span className="text-slate-300">•</span>
                </>
              ) : null}
              <button
                onClick={onClose}
                className="text-xs sm:text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Maybe Later
              </button>
            </div>

            {/* Access Code Form - only show when expanded and not in native app */}
            {!isNativeApp && showAccessCode && (
              <form onSubmit={handleAccessCodeSubmit} className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="Access code"
                    className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent uppercase tracking-wider"
                    disabled={isLoading}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !accessCode.trim()}
                    className="px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 active:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? '...' : 'Redeem'}
                  </button>
                </div>
                {accessCodeError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {accessCodeError}
                  </p>
                )}
                {accessCodeSuccess && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {accessCodeSuccess}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeatureCompactProps {
  icon: React.ReactNode;
  text: string;
  highlight?: boolean;
}

function FeatureCompact({ icon, text, highlight }: FeatureCompactProps) {
  return (
    <div className={`flex items-center gap-1.5 p-1.5 sm:p-2 rounded-lg ${
      highlight ? 'bg-teal-50' : 'bg-slate-50'
    }`}>
      <div className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center ${
        highlight ? 'bg-teal-100 text-teal-600' : 'bg-slate-200 text-slate-600'
      }`}>
        {icon}
      </div>
      <p className={`font-medium text-xs ${highlight ? 'text-teal-900' : 'text-slate-700'}`}>
        {text}
      </p>
    </div>
  );
}
