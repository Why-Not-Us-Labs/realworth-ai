'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isBullseyeAdmin, BULLSEYE_STORES } from '@/lib/partnerConfig';
import { MetricsCards } from '@/components/partner/dashboard/MetricsCards';
import { AppraisalsChart } from '@/components/partner/dashboard/AppraisalsChart';
import { PipelineView } from '@/components/partner/dashboard/PipelineView';
import SubmitAppraisalModal from '@/components/partner/dashboard/SubmitAppraisalModal';
import type { PipelineAppraisal } from '@/components/partner/dashboard/AppraisalRow';
import type { Session } from '@supabase/supabase-js';

type DashboardData = {
  metrics: {
    totalAppraisals: number;
    avgOfferAmount: number;
    acceptRate: number;
    totalOfferValue: number;
    pendingReviewCount: number;
    fulfillmentRate: number;
  };
  pipeline: {
    pending: PipelineAppraisal[];
    accepted: PipelineAppraisal[];
    declined: PipelineAppraisal[];
    review: PipelineAppraisal[];
    fulfilled: PipelineAppraisal[];
  };
  chartData: { date: string; count: number; value: number }[];
  stores: { id: string; name: string; count: number }[];
  declineReasons: { reason: string; count: number }[];
};

type AuthState = 'loading' | 'unauthenticated' | 'unauthorized' | 'authenticated';

export default function BullseyeDashboard() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [sourceStore, setSourceStore] = useState<string>('');
  const [signingIn, setSigningIn] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) {
        setAuthState('unauthenticated');
        return;
      }
      if (!isBullseyeAdmin(s.user.email)) {
        setAuthState('unauthorized');
        return;
      }
      setSession(s);
      setAuthState('authenticated');
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) {
        setAuthState('unauthenticated');
        setSession(null);
        return;
      }
      if (!isBullseyeAdmin(s.user.email)) {
        setAuthState('unauthorized');
        return;
      }
      setSession(s);
      setAuthState('authenticated');
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    setFetchError(null);

    const params = new URLSearchParams({ range });
    if (sourceStore) params.set('source_store', sourceStore);

    try {
      const res = await fetch(`/api/partner/dashboard?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load dashboard');
    }
  }, [session?.access_token, range, sourceStore]);

  useEffect(() => {
    if (authState === 'authenticated') fetchData();
  }, [authState, fetchData]);

  // Action handlers
  const handleUpdateStatus = async (id: string, status: 'accepted' | 'declined' | 'pending' | 'fulfilled' | 'no_show') => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/partner/dashboard/appraisal', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ appraisalId: id, status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to update status (${res.status})`);
      }
      setFetchError(null);
      fetchData();
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleAdjustOffer = async (id: string, amount: number) => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/partner/dashboard/appraisal', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ appraisalId: id, adjustedOffer: amount }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to adjust offer (${res.status})`);
      }
      setFetchError(null);
      fetchData();
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to adjust offer');
    }
  };

  const handleExport = async () => {
    if (!session?.access_token) return;
    const params = new URLSearchParams({ range });
    if (sourceStore) params.set('source_store', sourceStore);
    try {
      const res = await fetch(`/api/partner/dashboard/export?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bullseye-appraisals-${new Date().toISOString().substring(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to export CSV');
    }
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('Sign-in error:', error);
      setSigningIn(false);
    }
  };

  const handleMagicLink = async () => {
    if (!magicLinkEmail.trim()) return;
    setSendingMagicLink(true);
    setMagicLinkError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: magicLinkEmail.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/partner/bullseye/auth/callback`,
      },
    });
    setSendingMagicLink(false);
    if (error) {
      setMagicLinkError(error.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAuthState('unauthenticated');
  };

  // --- Auth screens ---
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center max-w-sm w-full">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/partners/bullseye-logo.png" alt="Bullseye" className="h-10" />
            <span className="text-slate-300 text-lg">x</span>
            <img src="/partners/realworth-collab-logo.png" alt="RealWorth" className="h-10" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Partner Dashboard</h1>
          <p className="text-sm text-slate-500 mb-6">Sign in to access your dashboard</p>

          {/* Google OAuth */}
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {signingIn ? 'Redirecting...' : 'Sign in with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Magic link */}
          {magicLinkSent ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-medium text-green-800">Check your email</p>
              <p className="text-xs text-green-600 mt-1">
                We sent a sign-in link to <strong>{magicLinkEmail}</strong>
              </p>
              <button
                onClick={() => { setMagicLinkSent(false); setMagicLinkEmail(''); }}
                className="text-xs text-green-700 underline mt-3"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={magicLinkEmail}
                onChange={(e) => setMagicLinkEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMagicLink()}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                onClick={handleMagicLink}
                disabled={sendingMagicLink || !magicLinkEmail.trim()}
                className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {sendingMagicLink ? 'Sending...' : 'Send magic link'}
              </button>
              {magicLinkError && (
                <p className="text-xs text-red-500">{magicLinkError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (authState === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-500 mb-6">
            Your account is not authorized to access the Bullseye dashboard. Contact your admin for access.
          </p>
          <button
            onClick={handleSignOut}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // --- Authenticated dashboard ---
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src="/partners/bullseye-logo.png" alt="Bullseye" className="h-8" />
          <span className="text-slate-300">x</span>
          <img src="/partners/realworth-collab-logo.png" alt="RealWorth" className="h-8" />
          <span className="text-sm font-semibold text-slate-900 ml-2">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">{session?.user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={sourceStore}
          onChange={(e) => setSourceStore(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
        >
          <option value="">All stores</option>
          {BULLSEYE_STORES.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="flex rounded-lg border border-slate-300 overflow-hidden">
          {(['7d', '30d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="text-xs font-medium px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            + New Appraisal
          </button>
          <button
            onClick={handleExport}
            className="text-xs font-medium px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {fetchError}
          <button onClick={fetchData} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Dashboard content */}
      {data ? (
        <div className="space-y-6">
          <MetricsCards metrics={data.metrics} />
          <AppraisalsChart data={data.chartData} />

          {/* Decline reasons breakdown */}
          {data.declineReasons && data.declineReasons.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Decline Reasons</h3>
              <div className="space-y-2">
                {data.declineReasons.map((dr) => {
                  const totalDeclines = data.declineReasons.reduce((s, d) => s + d.count, 0);
                  const pct = Math.round((dr.count / totalDeclines) * 100);
                  return (
                    <div key={dr.reason}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">{dr.reason}</span>
                        <span className="text-slate-500">{dr.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <PipelineView
            pipeline={data.pipeline}
            onUpdateStatus={handleUpdateStatus}
            onAdjustOffer={handleAdjustOffer}
          />
        </div>
      ) : !fetchError ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : null}

      {showSubmitModal && (
        <SubmitAppraisalModal
          onSuccess={() => { setShowSubmitModal(false); fetchData(); }}
          onClose={() => setShowSubmitModal(false)}
        />
      )}
    </div>
  );
}
