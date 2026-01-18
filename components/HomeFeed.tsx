'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { CompassIcon } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import { RarityIndicator } from '@/components/RarityBadge';
import { InstagramFeed } from '@/components/InstagramFeed';

const ITEMS_PER_PAGE = 30;

interface HomeFeedProps {
  isLoggedIn: boolean;
}

type ViewMode = 'feed' | 'grid';

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

// Icons
const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

// Feed icon (Instagram-style)
const FeedIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

export function HomeFeed({ isLoggedIn }: HomeFeedProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
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
            onClick={() => setViewMode('feed')}
            className={`p-1.5 rounded transition-all ${
              viewMode === 'feed'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label="Feed view"
            title="Instagram-style feed"
          >
            <FeedIcon />
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
        </div>
      </div>

      {/* Content */}
      {viewMode === 'feed' ? (
        /* Instagram-style Feed View */
        <InstagramFeed />
      ) : (
        /* Grid View */
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
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}

export default HomeFeed;
