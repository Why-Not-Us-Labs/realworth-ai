'use client';

import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { FeedPost, FeedPostData } from './FeedPost';
import { CommentSheet } from './CommentSheet';
import { AuthContext } from '@/components/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const ITEMS_PER_PAGE = 10;

type InstagramFeedProps = {
  className?: string;
};

export function InstagramFeed({ className = '' }: InstagramFeedProps) {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [activePost, setActivePost] = useState<FeedPostData | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch posts
  const fetchPosts = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const session = await supabase.auth.getSession();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (session.data.session?.access_token) {
        headers.Authorization = `Bearer ${session.data.session.access_token}`;
      }

      const response = await fetch(`/api/feed?offset=${offset}&limit=${ITEMS_PER_PAGE}`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (append) {
          setPosts(prev => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts);
        }
        setHasMore(data.posts.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPosts(0, false);
  }, [fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchPosts(posts.length, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, posts.length, fetchPosts]);

  const handleCommentClick = useCallback((post: FeedPostData) => {
    setActivePost(post);
    setShowComments(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    setShowComments(false);
    setActivePost(null);
  }, []);

  if (isLoading) {
    return (
      <div className={`${className}`}>
        {/* Skeleton loaders */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border-b border-slate-100 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center gap-3 px-3 py-2 h-14">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="flex-1">
                <div className="h-3 w-24 bg-slate-200 rounded" />
              </div>
            </div>
            {/* Image skeleton */}
            <div className="w-full aspect-[4/5] bg-slate-200" />
            {/* Action bar skeleton */}
            <div className="flex gap-4 px-3 py-2 h-11">
              <div className="w-6 h-6 bg-slate-200 rounded" />
              <div className="w-6 h-6 bg-slate-200 rounded" />
              <div className="w-6 h-6 bg-slate-200 rounded" />
            </div>
            {/* Caption skeleton */}
            <div className="px-3 pb-3">
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
        <div className="w-16 h-16 mb-4 text-slate-300">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <p className="text-slate-500 text-lg font-medium mb-2">No treasures yet</p>
        <p className="text-slate-400 text-sm">Be the first to share your finds!</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Posts */}
      {posts.map((post) => (
        <FeedPost
          key={post.id}
          post={post}
          onCommentClick={handleCommentClick}
        />
      ))}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {isLoadingMore && (
          <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full" />
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-slate-400 text-sm">You've reached the end</p>
        )}
      </div>

      {/* Comment Sheet */}
      {activePost && (
        <CommentSheet
          isOpen={showComments}
          onClose={handleCloseComments}
          appraisalId={activePost.id}
          ownerId={activePost.user.id}
        />
      )}
    </div>
  );
}

export default InstagramFeed;
