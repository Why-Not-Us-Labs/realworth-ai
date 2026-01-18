'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/components/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';

type BentoStats = {
  streak: number;
  totalValue: number;
  friendCount: number;
};

type BentoHeaderProps = {
  onStartAppraisal?: () => void;
  onUpgrade?: () => void;
};

function formatValue(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(amount)}`;
}

export function BentoHeader({ onStartAppraisal, onUpgrade }: BentoHeaderProps) {
  const { user, isAuthLoading } = useContext(AuthContext);
  const { isPro, isLoading: isSubLoading } = useSubscription(user?.id ?? null, user?.email);
  const [stats, setStats] = useState<BentoStats>({ streak: 0, totalValue: 0, friendCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user streak
        const { data: userData } = await supabase
          .from('users')
          .select('current_streak')
          .eq('id', user.id)
          .single();

        // Fetch total value from appraisals
        const { data: appraisals } = await supabase
          .from('appraisals')
          .select('price_low, price_high')
          .eq('user_id', user.id);

        const totalValue = appraisals?.reduce((sum, a) => {
          return sum + (a.price_low + a.price_high) / 2;
        }, 0) || 0;

        // Fetch friend count
        const { count: friendCount } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted');

        setStats({
          streak: userData?.current_streak || 0,
          totalValue,
          friendCount: friendCount || 0,
        });
      } catch (error) {
        console.error('Error fetching bento stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!isAuthLoading) {
      fetchStats();
    }
  }, [user?.id, isAuthLoading]);

  // Show loading skeleton
  if (isAuthLoading || isLoading) {
    return (
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt for non-authenticated users
  if (!user) {
    return (
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Discover treasures</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onStartAppraisal}
              className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Appraise</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Left: Avatar + Name + Stats */}
        <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {/* Avatar */}
          {user.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className="w-10 h-10 rounded-full border-2 border-teal-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-lg font-bold text-teal-600">
              {user.name?.charAt(0) || '?'}
            </div>
          )}

          {/* Name + Stats Row */}
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-tight">
              {user.name?.split(' ')[0]}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {stats.streak > 0 && (
                <span className="flex items-center gap-0.5" title="Day streak">
                  <span className="text-orange-500">🔥</span>
                  <span>{stats.streak}</span>
                </span>
              )}
              <span className="flex items-center gap-0.5" title="Total value discovered">
                <span className="text-teal-500">💎</span>
                <span>{formatValue(stats.totalValue)}</span>
              </span>
              <span className="flex items-center gap-0.5" title="Friends">
                <span className="text-blue-500">👥</span>
                <span>{stats.friendCount}</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Pro Badge or Upgrade */}
          {isPro ? (
            <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">
              PRO
            </span>
          ) : (
            <button
              onClick={onUpgrade}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 px-2 py-1 hover:bg-teal-50 rounded-lg transition-colors"
            >
              Upgrade
            </button>
          )}

          {/* Start Appraisal */}
          <button
            onClick={onStartAppraisal}
            className="flex items-center gap-1 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BentoHeader;
