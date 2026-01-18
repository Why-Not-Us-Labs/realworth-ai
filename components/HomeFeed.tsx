'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { CompassIcon } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { RarityBadge, RarityIndicator } from '@/components/RarityBadge';
import { FullScreenFeed } from '@/components/FullScreenFeed';

const ITEMS_PER_PAGE = 30;

interface HomeFeedProps {
  isLoggedIn: boolean;
}

type ViewMode = 'cards' | 'grid' | 'full';

interface PublicTreasure {
  id: string;
  item_name: string;
  image_url: string;
  price_low: number;
  price_high: number;
  currency: string;
  category: string;
  era: string | null;
  created_at: string;
  rarity_score: number | null;
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

// Icons
const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const CardsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

// Full screen / TikTok-style icon
const FullScreenIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
  </svg>
);

export function HomeFeed({ isLoggedIn }: HomeFeedProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [publicTreasures, setPublicTreasures] = useState<PublicTreasure[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch public treasures with pagination
  const fetchPublicTreasures = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    // Fetch count on initial load
    if (offset === 0) {
      const { count } = await supabase
        .from('appraisals')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true);

      setTotalCount(count || 0);
    }

    const { data, error } = await supabase
      .from('appraisals')
      .select(`
        id, item_name, image_url, price_low, price_high, currency, category, era, created_at, rarity_score,
        users:user_id (name, picture)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (!error && data) {
      if (append) {
        setPublicTreasures(prev => [...prev, ...(data as unknown as PublicTreasure[])]);
      } else {
        setPublicTreasures(data as unknown as PublicTreasure[]);
      }
      setHasMore(data.length === ITEMS_PER_PAGE);
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPublicTreasures(0, false);
  }, [fetchPublicTreasures]);

  // Load more function
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchPublicTreasures(publicTreasures.length, true);
    }
  }, [fetchPublicTreasures, isLoadingMore, hasMore, publicTreasures.length]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const isEmpty = publicTreasures.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200">
        <div className="flex items-center justify-center py-3.5">
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <CompassIcon className="w-5 h-5" />
            <span>Discover</span>
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {totalCount > 0 ? totalCount : publicTreasures.length}
            </span>
          </div>
        </div>
      </div>

      {/* View Toggle Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="text-sm text-slate-600">
          <span>See what others are finding</span>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={() => setViewMode('full')}
            className={`p-1.5 rounded transition-all ${
              viewMode === 'full'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label="Full screen view"
            title="Full screen (TikTok-style)"
          >
            <FullScreenIcon />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-all ${
              viewMode === 'grid'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label="Grid view"
          >
            <GridIcon />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded transition-all ${
              viewMode === 'cards'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label="Card view"
          >
            <CardsIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 sm:p-3">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Loading treasures...</p>
          </div>
        ) : isEmpty ? (
          <div className="py-12 text-center">
            <CompassIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No public treasures yet</p>
            <p className="text-slate-400 text-xs mt-1">Be the first to share!</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {publicTreasures.map((treasure) => {
              const avgValue = (treasure.price_low + treasure.price_high) / 2;
              return (
                <Link
                  key={treasure.id}
                  href={`/treasure/${treasure.id}`}
                  className="relative aspect-square bg-slate-100 overflow-hidden group"
                >
                  <img
                    src={treasure.image_url}
                    alt={treasure.item_name}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Rarity indicator - top right */}
                  {treasure.rarity_score !== null && treasure.rarity_score >= 4 && (
                    <div className="absolute top-1.5 right-1.5">
                      <RarityIndicator score={treasure.rarity_score} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="text-white text-center px-1">
                      <p className="font-bold text-sm drop-shadow-lg">
                        {formatCurrency(avgValue, treasure.currency)}
                      </p>
                    </div>
                  </div>
                  {treasure.users?.picture && (
                    <div className="absolute bottom-1 left-1 w-5 h-5 rounded-full border-2 border-white overflow-hidden shadow-sm">
                      <img src={treasure.users.picture} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </Link>
              );
            })}

            {/* Load more trigger for infinite scroll */}
            <div ref={loadMoreRef} className="col-span-3 py-4 flex justify-center">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full" />
                  <span className="text-sm">Loading more...</span>
                </div>
              ) : hasMore ? (
                <span className="text-xs text-slate-400">Scroll for more</span>
              ) : publicTreasures.length > 0 ? (
                <span className="text-xs text-slate-400">You've seen all {totalCount} treasures!</span>
              ) : null}
            </div>
          </div>
        ) : (
          /* Cards View */
          <div className="space-y-2">
            {publicTreasures.map((treasure) => {
              const avgValue = (treasure.price_low + treasure.price_high) / 2;
              return (
                <Link
                  key={treasure.id}
                  href={`/treasure/${treasure.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors active:bg-slate-100"
                >
                  <div className="relative w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                    <img src={treasure.image_url} alt={treasure.item_name} className="w-full h-full object-cover" />
                    {/* Rarity indicator on card thumbnail */}
                    {treasure.rarity_score !== null && treasure.rarity_score >= 4 && (
                      <div className="absolute top-0.5 right-0.5">
                        <RarityIndicator score={treasure.rarity_score} />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{treasure.item_name}</h4>
                    <p className="text-xs text-slate-500">{treasure.category} {treasure.era ? `· ${treasure.era}` : ''}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-teal-600">{formatCurrency(avgValue, treasure.currency)}</span>
                      {treasure.rarity_score !== null && treasure.rarity_score >= 7 && (
                        <RarityBadge score={treasure.rarity_score} size="sm" showLabel={false} />
                      )}
                      <span className="text-xs text-slate-400">{timeAgo(treasure.created_at)}</span>
                    </div>
                  </div>
                  {treasure.users?.picture && (
                    <img src={treasure.users.picture} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                  )}
                </Link>
              );
            })}

            {/* Load more trigger for cards view */}
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full" />
                  <span className="text-sm">Loading more...</span>
                </div>
              ) : hasMore ? (
                <span className="text-xs text-slate-400">Scroll for more</span>
              ) : publicTreasures.length > 0 ? (
                <span className="text-xs text-slate-400">You've seen all {totalCount} treasures!</span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Full Screen Feed Modal */}
      {viewMode === 'full' && (
        <FullScreenFeed onClose={() => setViewMode('grid')} />
      )}
    </div>
  );
}

export default HomeFeed;
