'use client';

import React, { useState, useEffect } from 'react';
import { DownloadIcon, XIcon } from './icons';
import { event as trackEvent } from '@/lib/analytics';

// Type for the BeforeInstallPromptEvent (not in standard TypeScript lib)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'default' | 'compact';
}

// Detect iOS Safari
const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua); // Chrome on iOS
  const isFirefox = /FxiOS/.test(ua); // Firefox on iOS
  return isIOS && isWebkit && !isChrome && !isFirefox;
};

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'default'
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS Safari
    setIsIOS(isIOSSafari());

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running as installed PWA on iOS
    if ((navigator as { standalone?: boolean }).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      // Track installation in analytics
      trackEvent('pwa_installed', {
        event_category: 'engagement',
        event_label: 'PWA Install',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // For iOS Safari, show the instruction modal
    if (isIOS) {
      setShowIOSModal(true);
      trackEvent('pwa_install_prompt', {
        event_category: 'engagement',
        event_label: 'ios_modal_shown',
      });
      return;
    }

    // For Android/Chrome, use the native prompt
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        // User accepted the install prompt
        setDeferredPrompt(null);
      }

      // Track the prompt outcome
      trackEvent('pwa_install_prompt', {
        event_category: 'engagement',
        event_label: outcome,
      });
    } catch (error) {
      console.error('Error showing install prompt:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  // Don't render if already installed
  if (isInstalled) {
    return null;
  }

  // Don't render if not iOS and no deferred prompt (unsupported browser)
  if (!isIOS && !deferredPrompt) {
    return null;
  }

  // iOS Safari instruction modal
  const IOSInstallModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl animate-slide-up mb-16 sm:mb-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Install RealWorth
          </h3>
          <button
            onClick={() => setShowIOSModal(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-600 text-sm mb-4">
          Add to your home screen for quick access:
        </p>

        <div className="space-y-3">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">
              1
            </div>
            <p className="text-slate-800 text-sm">
              Tap <span className="font-medium">Share</span> <span className="text-base">⬆️</span> below
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">
              2
            </div>
            <p className="text-slate-800 text-sm">
              Tap <span className="font-medium">&quot;Add to Home Screen&quot;</span> <span className="text-base">➕</span>
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">
              3
            </div>
            <p className="text-slate-800 text-sm">
              Tap <span className="font-medium">&quot;Add&quot;</span> in top right
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowIOSModal(false)}
          className="mt-4 w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center justify-center p-2 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors ${className}`}
          title="Install App"
          aria-label="Install RealWorth app"
        >
          <DownloadIcon className="w-5 h-5" />
        </button>
        {showIOSModal && <IOSInstallModal />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={`flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-full text-sm transition-all ${className}`}
        aria-label="Install RealWorth app"
      >
        <DownloadIcon className="w-4 h-4" />
        <span className="hidden sm:inline">
          {isInstalling ? 'Installing...' : 'Install App'}
        </span>
        <span className="sm:hidden">
          {isInstalling ? '...' : 'Install'}
        </span>
      </button>
      {showIOSModal && <IOSInstallModal />}
    </>
  );
};

export default PWAInstallButton;
