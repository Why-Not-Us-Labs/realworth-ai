
'use client';

import React, { useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoIcon, SparklesIcon } from './icons';
import { Auth } from './Auth';
import { AuthContext } from './contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import ProBadge from './ProBadge';
import PWAInstallButton from './PWAInstallButton';
import { HelpButton, HelpChatWidget } from './HelpChatWidget';

interface HeaderProps {
  onUpgradeClick?: () => void;
}

const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent.toLowerCase();
  const platform = (window.navigator as any).platform?.toLowerCase() || '';
  
  // Check for desktop platforms (exclude these)
  const isDesktopPlatform = /win32|win64|macintel|linux x86_64|linux/.test(platform);
  
  if (isDesktopPlatform) {
    return false;
  }
  
  const isIPhone = /iphone/.test(ua) && !/ipad/.test(ua);
  const isAndroidPhone = /android/.test(ua) && /mobile/.test(ua);
  const isOtherMobile = /webos|blackberry|iemobile|operamini/.test(ua);
  
  return isIPhone || isAndroidPhone || isOtherMobile;
};

export const Header: React.FC<HeaderProps> = ({ onUpgradeClick }) => {
  const { user } = useContext(AuthContext);
  const { isPro, isVerifying } = useSubscription(user?.id || null, user?.email);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Feature flags for new features
  const { isEnabled: marketplaceEnabled } = useFeatureFlag('marketplace', { userId: user?.id, isPro });
  const { isEnabled: exploreEnabled } = useFeatureFlag('explore_events', { userId: user?.id, isPro });

  return (
    <>
      <HelpChatWidget isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    {/* Hide on mobile - BentoHeader handles mobile view */}
    <header className="hidden sm:block p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-0 hover:opacity-80 transition-opacity">
              <LogoIcon className="w-10 h-10 sm:w-12 sm:h-12 -ml-2 -mt-1.5" />
              <h1 className="text-lg sm:text-2xl font-bold tracking-tighter text-slate-900">
                RealWorth<span className="font-light text-slate-500">.ai</span>
              </h1>
            </Link>
            {/* Pro badge for Pro users - next to logo */}
            {user && isPro && !isVerifying && (
              <ProBadge />
            )}
          </div>
          <nav className="hidden sm:flex items-center gap-4">
            <Link
              href="/discover"
              className="text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/?capture=true"
              className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start Appraisal
            </Link>
            <Link
              href="/profile"
              className="text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              My Treasures
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* PWA Install Button - shows only when install is available and on mobile device */}
          {isMobile && <PWAInstallButton variant="compact" />}
          {/* Activating Pro indicator - shows during post-checkout verification */}
          {user && isVerifying && (
            <span className="hidden sm:flex items-center gap-2 text-teal-600 font-medium text-sm animate-pulse">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Activating Pro...
            </span>
          )}
          {/* Upgrade to Pro button - show for logged in non-Pro users (not during verification) */}
          {user && !isPro && !isVerifying && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30"
            >
              <SparklesIcon className="w-4 h-4" />
              Go Pro
            </button>
          )}
          <HelpButton onClick={() => setIsHelpOpen(true)} />
          <Auth />
        </div>
      </div>
    </header>
    </>
  );
};
