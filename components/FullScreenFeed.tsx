'use client';

import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { RarityBadge } from '@/components/RarityBadge';
import { EngagementButtons } from '@/components/EngagementButtons';
import { CommentSheet } from '@/components/CommentSheet';
import { AuthContext } from '@/components/contexts/AuthContext';

const ITEMS_PER_PAGE = 10;

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
  rarity_score: number | null;
  like_count: number;
  users: {
    id: string;
    name: string;
    picture: string;
  } | null;
}

interface FullScreenFeedProps {
  onClose?: () => void;
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

// Share icon
const ShareIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

// Close/minimize icon
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Grid icon to exit full screen
const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

export function FullScreenFeed({ onClose }: FullScreenFeedProps) {
  const { user } = useContext(AuthContext);
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [activeCommentTreasure, setActiveCommentTreasure] = useState<Treasure | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch treasures
  const fetchTreasures = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const { data, error } = await supabase
      .from('appraisals')
      .select(`
        id, item_name, image_url, price_low, price_high, currency, category, era, created_at, rarity_score, like_count,
        users:user_id (id, name, picture)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (!error && data) {
      if (append) {
        setTreasures(prev => [...prev, ...(data as unknown as Treasure[])]);
      } else {
        setTreasures(data as unknown as Treasure[]);
      }
      setHasMore(data.length === ITEMS_PER_PAGE);
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTreasures(0, false);
  }, [fetchTreasures]);

  // Track current slide with intersection observer
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setCurrentIndex(index);

            // Load more when near the end
            if (index >= treasures.length - 3 && hasMore && !isLoadingMore) {
              fetchTreasures(treasures.length, true);
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.6,
      }
    );

    const slides = containerRef.current.querySelectorAll('[data-index]');
    slides.forEach((slide) => observerRef.current?.observe(slide));

    return () => observerRef.current?.disconnect();
  }, [treasures, hasMore, isLoadingMore, fetchTreasures]);

  // Share functionality
  const handleShare = async (treasure: Treasure) => {
    const url = `${window.location.origin}/treasure/${treasure.id}`;
    const avgValue = (treasure.price_low + treasure.price_high) / 2;

    if (navigator.share) {
      try {
        await navigator.share({
          title: treasure.item_name,
          text: `Check out this treasure worth ${formatCurrency(avgValue, treasure.currency)}!`,
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      // Could add a toast here
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="animate-spin w-10 h-10 border-3 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (treasures.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-white">
        <p className="text-lg mb-4">No treasures to discover yet</p>
        <button
          onClick={onClose}
          className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-full transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">Discover</span>
          <span className="text-white/60 text-sm">
            {currentIndex + 1} / {treasures.length}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <GridIcon />
          </button>
        )}
      </div>

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {treasures.map((treasure, index) => {
          const avgValue = (treasure.price_low + treasure.price_high) / 2;

          return (
            <div
              key={treasure.id}
              data-index={index}
              className="h-full w-full snap-start snap-always relative flex items-center justify-center"
            >
              {/* Background image */}
              <div className="absolute inset-0">
                <img
                  src={treasure.image_url}
                  alt={treasure.item_name}
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
              </div>

              {/* Rarity badge - top left */}
              {treasure.rarity_score !== null && treasure.rarity_score >= 4 && (
                <div className="absolute top-20 left-4 z-10">
                  <RarityBadge score={treasure.rarity_score} size="md" />
                </div>
              )}

              {/* Right side action buttons */}
              <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5 z-10">
                {/* User avatar */}
                <Link href={treasure.users?.id ? `/user/${treasure.users.id}` : '#'} className="relative">
                  {treasure.users?.picture ? (
                    <img
                      src={treasure.users.picture}
                      alt={treasure.users.name}
                      className="w-12 h-12 rounded-full border-2 border-white"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/30 border-2 border-white" />
                  )}
                </Link>

                {/* Engagement buttons (vertical layout) */}
                <div className="flex flex-col items-center gap-4">
                  <EngagementButtons
                    appraisalId={treasure.id}
                    initialLikeCount={treasure.like_count || 0}
                    initialIsLiked={false}
                    initialIsSaved={false}
                    onCommentClick={() => {
                      setActiveCommentTreasure(treasure);
                      setShowComments(true);
                    }}
                    size="lg"
                    variant="vertical"
                    showLabels
                  />

                  {/* Share button */}
                  <button
                    onClick={() => handleShare(treasure)}
                    className="flex flex-col items-center gap-1 text-white"
                  >
                    <div className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                      <ShareIcon />
                    </div>
                    <span className="text-xs">Share</span>
                  </button>
                </div>
              </div>

              {/* Bottom info overlay */}
              <div className="absolute bottom-0 left-0 right-16 p-4 z-10">
                {/* Owner info */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-semibold text-sm">
                    @{treasure.users?.name?.split(' ')[0]?.toLowerCase() || 'anonymous'}
                  </span>
                  <span className="text-white/60 text-xs">{timeAgo(treasure.created_at)}</span>
                </div>

                {/* Item name and value */}
                <Link href={`/treasure/${treasure.id}`}>
                  <h2 className="text-white font-bold text-xl mb-1 line-clamp-2 hover:underline">
                    {treasure.item_name}
                  </h2>
                </Link>

                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(avgValue, treasure.currency)}
                  </span>
                  <span className="text-white/60 text-sm px-2 py-0.5 bg-white/20 rounded-full">
                    {treasure.category}
                  </span>
                </div>

                {treasure.era && (
                  <p className="text-white/70 text-sm mt-1">{treasure.era}</p>
                )}

                {/* Tap to view details hint */}
                <p className="text-white/40 text-xs mt-3">Tap image for details</p>
              </div>

              {/* Clickable overlay to view details */}
              <Link
                href={`/treasure/${treasure.id}`}
                className="absolute inset-0 z-0"
                aria-label={`View ${treasure.item_name}`}
              />
            </div>
          );
        })}

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Scroll hint for first item */}
      {currentIndex === 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="flex flex-col items-center text-white/60">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-xs">Swipe up</span>
          </div>
        </div>
      )}

      {/* Comment Sheet */}
      {activeCommentTreasure && (
        <CommentSheet
          isOpen={showComments}
          onClose={() => {
            setShowComments(false);
            setActiveCommentTreasure(null);
          }}
          appraisalId={activeCommentTreasure.id}
          ownerId={activeCommentTreasure.users?.id || ''}
        />
      )}
    </div>
  );
}

export default FullScreenFeed;
