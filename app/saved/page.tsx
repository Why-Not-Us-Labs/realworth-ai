'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { LogoIcon, BookmarkIcon, GemIcon } from '@/components/icons';
import { Footer } from '@/components/Footer';
import { AuthContext } from '@/components/contexts/AuthContext';
import { SkeletonGrid } from '@/components/SkeletonCard';
import { EngagementButtons } from '@/components/EngagementButtons';
import { supabase } from '@/lib/supabase';

interface SavedTreasure {
  id: string;
  item_name: string;
  image_url: string;
  price_low: number;
  price_high: number;
  currency: string;
  category: string;
  era: string | null;
  created_at: string;
  like_count: number;
  isLiked: boolean;
  isSaved: boolean;
  savedAt: string;
  users: {
    name: string;
    picture: string;
  } | null;
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function SavedPage() {
  const { user, isAuthLoading } = useContext(AuthContext);
  const [treasures, setTreasures] = useState<SavedTreasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSavedItems() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/feed/saved', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (data.treasures) {
          setTreasures(data.treasures);
        }
      } catch (error) {
        console.error('Error fetching saved items:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!isAuthLoading) {
      fetchSavedItems();
    }
  }, [user, isAuthLoading]);

  // Handle unsave - remove from local state
  const handleUnsave = (appraisalId: string) => {
    setTreasures(prev => prev.filter(t => t.id !== appraisalId));
  };

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
            <Link href="/discover" className="text-slate-600 hover:text-teal-600 font-medium transition-colors text-sm">
              Discover
            </Link>
            <Link href="/saved" className="text-teal-600 font-medium text-sm">
              Saved
            </Link>
            <Link href="/profile" className="text-slate-600 hover:text-teal-600 font-medium transition-colors text-sm">
              Profile
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-3">
            <BookmarkIcon className="w-12 h-12 sm:w-10 sm:h-10 text-white/80" fill="currentColor" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Saved Treasures
          </h1>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl mx-auto">
            Your collection of favorites
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:p-6 md:p-8 pb-24">
        {!user && !isAuthLoading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="flex justify-center mb-4">
              <BookmarkIcon className="w-12 h-12 text-slate-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Sign in to see your saved items</h2>
            <p className="text-slate-500 text-sm mb-6">Save treasures you love and come back to them anytime</p>
            <Link
              href="/"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : isLoading || isAuthLoading ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
            </div>
            <SkeletonGrid count={6} variant="card" />
          </div>
        ) : treasures.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="flex justify-center mb-4">
              <BookmarkIcon className="w-12 h-12 text-slate-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">No saved treasures yet</h2>
            <p className="text-slate-500 text-sm mb-6">Explore and save treasures you love!</p>
            <Link
              href="/discover"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Discover Treasures
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-500 mb-4">
              {treasures.length} saved treasure{treasures.length !== 1 ? 's' : ''}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {treasures.map((treasure) => {
                const avgValue = (treasure.price_low + treasure.price_high) / 2;

                return (
                  <div
                    key={treasure.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden group"
                  >
                    <Link href={`/treasure/${treasure.id}`}>
                      {/* Image */}
                      <div className="relative aspect-square bg-slate-100 overflow-hidden">
                        {treasure.image_url && (
                          <img
                            src={treasure.image_url}
                            alt={treasure.item_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}

                        {/* Value Badge */}
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
                          <span className="text-sm font-bold flex items-center gap-1">
                            <GemIcon className="w-3.5 h-3.5" />
                            {formatCurrency(avgValue, treasure.currency)}
                          </span>
                        </div>

                        {/* Category Badge */}
                        <div className="absolute bottom-3 left-3">
                          <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-2 py-1 rounded-full">
                            {treasure.category}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-bold text-slate-900 truncate group-hover:text-teal-600 transition-colors">
                          {treasure.item_name}
                        </h3>

                        {treasure.era && (
                          <p className="text-sm text-slate-500 mt-0.5">{treasure.era}</p>
                        )}
                      </div>
                    </Link>

                    {/* Engagement Buttons (outside Link to prevent navigation on click) */}
                    <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                      <div className="pt-3">
                        <EngagementButtons
                          appraisalId={treasure.id}
                          initialLikeCount={treasure.like_count ?? 0}
                          initialIsLiked={treasure.isLiked}
                          initialIsSaved={treasure.isSaved}
                          size="sm"
                        />
                      </div>

                      {/* Owner & Saved Time */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          {treasure.users?.picture ? (
                            <img
                              src={treasure.users.picture}
                              alt={treasure.users.name}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200" />
                          )}
                          <span className="text-xs text-slate-600 truncate max-w-[100px]">
                            {treasure.users?.name || 'Anonymous'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          Saved {timeAgo(treasure.savedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
