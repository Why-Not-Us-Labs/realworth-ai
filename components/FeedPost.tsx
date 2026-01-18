'use client';

import React, { useState, useContext, useCallback } from 'react';
import Link from 'next/link';
import { PostHeader } from './PostHeader';
import { ImageCarousel } from './ImageCarousel';
import { EngagementButtons } from './EngagementButtons';
import { RarityBadge } from './RarityBadge';
import { AuthContext } from '@/components/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';

export type FeedPostData = {
  id: string;
  item_name: string;
  image_url: string;
  image_urls: string[] | null;
  price_low: number;
  price_high: number;
  currency: string;
  category: string;
  era: string | null;
  created_at: string;
  rarity_score: number | null;
  like_count: number;
  comment_count: number;
  description?: string;
  user: {
    id: string;
    name: string;
    picture: string | null;
  };
  isLiked: boolean;
  isSaved: boolean;
};

type FeedPostProps = {
  post: FeedPostData;
  onCommentClick: (post: FeedPostData) => void;
};

export function FeedPost({ post, onCommentClick }: FeedPostProps) {
  const { user } = useContext(AuthContext);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [isLiked, setIsLiked] = useState(post.isLiked);

  // Build images array
  const images = post.image_urls?.length ? post.image_urls : [post.image_url];
  const avgValue = (post.price_low + post.price_high) / 2;

  const handleDoubleTap = useCallback(async () => {
    if (!user || isLiked) return;

    // Optimistic update
    setIsLiked(true);
    setLikeCount(prev => prev + 1);

    try {
      await fetch('/api/feed/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ appraisalId: post.id }),
      });
    } catch {
      // Revert on error
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    }
  }, [user, isLiked, post.id]);

  const handleLikeChange = useCallback((newIsLiked: boolean, newCount: number) => {
    setIsLiked(newIsLiked);
    setLikeCount(newCount);
  }, []);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/treasure/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [post.id]);

  return (
    <article className="bg-white border-b border-slate-100">
      {/* Header */}
      <PostHeader
        userId={post.user.id}
        userName={post.user.name}
        userPicture={post.user.picture}
        timestamp={post.created_at}
      />

      {/* Image Carousel */}
      <div className="relative">
        <ImageCarousel
          images={images}
          alt={post.item_name}
          onDoubleTap={handleDoubleTap}
        />

        {/* Rarity badge overlay */}
        {post.rarity_score !== null && post.rarity_score >= 4 && (
          <div className="absolute top-3 left-3 z-10">
            <RarityBadge score={post.rarity_score} size="sm" />
          </div>
        )}
      </div>

      {/* Engagement Buttons */}
      <EngagementButtons
        appraisalId={post.id}
        initialLikeCount={likeCount}
        initialIsLiked={isLiked}
        initialIsSaved={post.isSaved}
        commentCount={post.comment_count}
        onCommentClick={() => onCommentClick(post)}
        onShare={handleShare}
        onLikeChange={handleLikeChange}
        size="md"
        className="px-2 py-2"
      />

      {/* Caption: Item name + value */}
      <div className="px-3 pb-2">
        <Link href={`/treasure/${post.id}`} className="group">
          <span className="font-semibold text-sm text-slate-900 group-hover:underline">
            {post.item_name}
          </span>
          <span className="text-sm text-emerald-600 font-bold ml-2">
            {formatCurrency(avgValue, post.currency)}
          </span>
        </Link>
        {post.category && (
          <span className="text-xs text-slate-500 ml-2 px-1.5 py-0.5 bg-slate-100 rounded">
            {post.category}
          </span>
        )}
      </div>

      {/* Description (truncated) */}
      {post.description && (
        <div className="px-3 pb-2">
          <p className="text-sm text-slate-600 line-clamp-2">{post.description}</p>
        </div>
      )}

      {/* View comments link */}
      {post.comment_count > 0 && (
        <button
          onClick={() => onCommentClick(post)}
          className="px-3 pb-3 text-sm text-slate-400 hover:text-slate-600"
        >
          View all {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
        </button>
      )}
    </article>
  );
}

export default FeedPost;
