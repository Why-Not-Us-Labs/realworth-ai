'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAllFeatureFlags } from '@/hooks/useFeatureFlag';
import { FeatureFlagName } from '@/services/featureFlagService';
import { LogoIcon } from '@/components/icons';

// Feature flag display names and descriptions
const FLAG_METADATA: Record<string, { displayName: string; icon: string }> = {
  ai_chat: {
    displayName: 'AI Chat Assistant',
    icon: '💬',
  },
  insurance_certificates: {
    displayName: 'Insurance Certificates',
    icon: '📄',
  },
  dealer_network: {
    displayName: 'Dealer Network',
    icon: '🤝',
  },
  one_click_selling: {
    displayName: 'One-Click Selling',
    icon: '🛒',
  },
  price_tracking: {
    displayName: 'Price Tracking',
    icon: '📈',
  },
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { flags, isLoading, updateFlag, refresh } = useAllFeatureFlags();
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    const adminToken = localStorage.getItem('realworth_admin_token');
    if (adminToken !== 'authenticated') {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('realworth_admin_token');
    router.push('/admin/login');
  };

  const handleToggle = async (flagName: string, currentEnabled: boolean) => {
    setUpdatingFlag(flagName);
    try {
      await updateFlag(flagName as FeatureFlagName, { enabled: !currentEnabled });
    } finally {
      setUpdatingFlag(null);
    }
  };

  if (isCheckingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoIcon className="w-8 h-8" />
            <h1 className="text-xl font-bold text-slate-900">
              RealWorth<span className="text-slate-400 font-normal">.ai</span>
            </h1>
            <span className="ml-2 px-2 py-1 text-xs font-semibold bg-teal-100 text-teal-700 rounded-full">
              Admin
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Feature Flags</h2>
          <p className="text-slate-500 mt-1">
            Toggle features on and off for A/B testing and gradual rollouts
          </p>
        </div>

        {/* Feature Flags Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/2 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {flags.map((flag) => {
              const metadata = FLAG_METADATA[flag.name] || {
                displayName: flag.name,
                icon: '🔧',
              };
              const isUpdating = updatingFlag === flag.name;

              return (
                <div
                  key={flag.id}
                  className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all ${
                    flag.enabled
                      ? 'border-teal-500 shadow-md shadow-teal-500/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{metadata.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {metadata.displayName}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {flag.description || 'No description'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggle(flag.name, flag.enabled)}
                      disabled={isUpdating}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                        flag.enabled ? 'bg-teal-500' : 'bg-slate-300'
                      } ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 flex items-center gap-3 text-xs">
                    <span className={`px-2.5 py-1 rounded-full font-medium ${
                      flag.enabled
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    {flag.targetProOnly && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                        Pro Only
                      </span>
                    )}
                    {flag.targetPercentage < 100 && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {flag.targetPercentage}% Rollout
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => refresh()}
            className="px-4 py-2 text-sm text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          >
            Refresh Flags
          </button>
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-6 border border-teal-200">
          <h3 className="text-sm font-semibold text-teal-900 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How Feature Flags Work
          </h3>
          <ul className="text-sm text-teal-800 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              Toggle switches enable/disable features globally
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              "Pro Only" features require an active Pro subscription
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              Percentage rollouts gradually expose features to users
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              Changes take effect within 1 minute (cache TTL)
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center p-6 text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} RealWorth.ai Admin Panel</p>
      </footer>
    </div>
  );
}
