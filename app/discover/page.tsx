'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { LogoIcon, CompassIcon } from '@/components/icons';
import { Footer } from '@/components/Footer';
import { DiscoverFeed } from '@/components/DiscoverFeed';
import { AuthContext } from '@/components/contexts/AuthContext';
import { SkeletonGrid } from '@/components/SkeletonCard';
import { WeeklyLeaderboard } from '@/components/WeeklyLeaderboard';

interface Treasure {
  id: string;
  item_name: string;
  image_url: string;
  price_low: number;
  price_high: number;
  currency: string;
  category: string;
  era: string | null;
  created_at: string;
  visibility?: 'public' | 'friends';
  users: {
    name: string;
    picture: string;
  } | null;
}

export default function DiscoverPage() {
  const { user, isAuthLoading } = useContext(AuthContext);
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTreasures() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (user?.id) {
          params.set('userId', user.id);
        }

        const response = await fetch(`/api/discover?${params.toString()}`);
        const data = await response.json();

        if (data.treasures) {
          setTreasures(data.treasures);
        }
      } catch (error) {
        console.error('Error fetching treasures:', error);
      } finally {
        setIsLoading(false);
      }
    }

    // Wait for auth to finish loading before fetching
    if (!isAuthLoading) {
      fetchTreasures();
    }
  }, [user?.id, isAuthLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon className="w-8 h-8" />
            <span className="font-bold text-xl text-slate-900">RealWorth<span className="font-light text-slate-500">.ai</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/discover" className="text-teal-600 font-medium text-sm">
              Discover
            </Link>
            <Link
              href="/?capture=true"
              className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start Appraisal
            </Link>
            <Link href="/profile" className="text-slate-600 hover:text-teal-600 font-medium transition-colors text-sm">
              My Treasures
            </Link>
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              title="Profile"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-4">
            <div className="flex justify-center mb-3">
              <CompassIcon className="w-12 h-12 sm:w-10 sm:h-10 text-white/80" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Discover Treasures
            </h1>
            <p className="text-white/90 text-sm sm:text-base max-w-2xl mx-auto">
              See what amazing finds others are uncovering
            </p>
          </div>

          {/* Weekly Leaderboard */}
          <div className="mt-4">
            <WeeklyLeaderboard />
          </div>
        </div>
      </div>

      {/* Feed */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:p-6 md:p-8">
        {isLoading || isAuthLoading ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-9 w-20 bg-slate-200 rounded-lg animate-pulse" />
            </div>
            <SkeletonGrid count={6} variant="card" />
          </div>
        ) : (
          <DiscoverFeed treasures={treasures} showVisibility={!!user} />
        )}
      </main>

      <Footer />
    </div>
  );
}
