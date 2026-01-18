'use client';

import React, { useState, useContext } from 'react';
import { HeartIcon, BookmarkIcon, ChatBubbleIcon, ShareIcon } from '@/components/icons';
import { AuthContext } from '@/components/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type EngagementButtonsProps = {
  appraisalId: string;
  initialLikeCount: number;
  initialIsLiked: boolean;
  initialIsSaved: boolean;
  commentCount?: number;
  onCommentClick?: () => void;
  onShare?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  className?: string;
};

export function EngagementButtons({
  appraisalId,
  initialLikeCount,
  initialIsLiked,
  initialIsSaved,
  commentCount = 0,
  onCommentClick,
  onShare,
  size = 'md',
  variant = 'horizontal',
  showLabels = false,
  className = '',
}: EngagementButtonsProps) {
  const { user } = useContext(AuthContext);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  const buttonPadding = size === 'sm' ? 'p-1.5' : size === 'lg' ? 'p-3' : 'p-2';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-sm';
  const isVertical = variant === 'vertical';

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || isLiking) return;

    // Optimistic update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
    setIsLiking(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // Revert optimistic update
        setIsLiked(!newIsLiked);
        setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1);
        return;
      }

      const response = await fetch('/api/feed/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ appraisalId }),
      });

      if (!response.ok) {
        // Revert optimistic update
        setIsLiked(!newIsLiked);
        setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1);
      } else {
        // Update with actual server values
        const data = await response.json();
        setIsLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update
      setIsLiked(!newIsLiked);
      setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || isSaving) return;

    // Optimistic update
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);
    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsSaved(!newIsSaved);
        return;
      }

      const response = await fetch('/api/feed/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ appraisalId }),
      });

      if (!response.ok) {
        setIsSaved(!newIsSaved);
      } else {
        const data = await response.json();
        setIsSaved(data.saved);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      setIsSaved(!newIsSaved);
    } finally {
      setIsSaving(false);
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCommentClick?.();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare?.();
  };

  // Vertical layout styles for full-screen feed
  const verticalButtonStyles = isVertical
    ? 'flex flex-col items-center gap-1'
    : 'flex items-center gap-1';

  const verticalContainerStyles = isVertical
    ? 'flex flex-col items-center gap-4'
    : 'flex items-center gap-1';

  // For vertical dark mode (full-screen feed)
  const bgHover = isVertical ? 'hover:bg-white/20' : '';

  return (
    <div className={`${verticalContainerStyles} ${className}`}>
      {/* Like button */}
      <button
        onClick={handleLike}
        disabled={!user || isLiking}
        className={`${verticalButtonStyles} ${buttonPadding} rounded-full transition-all ${
          isLiked
            ? 'text-red-500 hover:text-red-600'
            : isVertical ? 'text-white hover:text-red-400' : 'text-slate-400 hover:text-red-500'
        } ${!user ? 'opacity-50 cursor-not-allowed' : isVertical ? bgHover : 'hover:bg-red-50'}`}
        aria-label={isLiked ? 'Unlike' : 'Like'}
      >
        <HeartIcon
          className={`${iconSize} transition-transform ${isLiked ? 'scale-110' : ''}`}
          fill={isLiked ? 'currentColor' : 'none'}
        />
        {(likeCount > 0 || showLabels) && (
          <span className={`${textSize} font-medium`}>
            {likeCount > 0 ? likeCount : showLabels ? 'Like' : ''}
          </span>
        )}
      </button>

      {/* Comment button (optional) */}
      {onCommentClick && (
        <button
          onClick={handleComment}
          className={`${verticalButtonStyles} ${buttonPadding} rounded-full transition-all ${
            isVertical ? 'text-white hover:text-teal-300' : 'text-slate-400 hover:text-teal-500'
          } ${isVertical ? bgHover : 'hover:bg-teal-50'}`}
          aria-label="Comment"
        >
          <ChatBubbleIcon className={iconSize} />
          {(commentCount > 0 || showLabels) && (
            <span className={`${textSize} font-medium`}>
              {commentCount > 0 ? commentCount : showLabels ? 'Comment' : ''}
            </span>
          )}
        </button>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!user || isSaving}
        className={`${verticalButtonStyles} ${buttonPadding} rounded-full transition-all ${
          isSaved
            ? 'text-teal-400 hover:text-teal-300'
            : isVertical ? 'text-white hover:text-teal-300' : 'text-slate-400 hover:text-teal-500'
        } ${!user ? 'opacity-50 cursor-not-allowed' : isVertical ? bgHover : 'hover:bg-teal-50'}`}
        aria-label={isSaved ? 'Unsave' : 'Save'}
      >
        <BookmarkIcon
          className={`${iconSize} transition-transform ${isSaved ? 'scale-110' : ''}`}
          fill={isSaved ? 'currentColor' : 'none'}
        />
        {showLabels && (
          <span className={`${textSize} font-medium`}>{isSaved ? 'Saved' : 'Save'}</span>
        )}
      </button>

      {/* Share button (optional) */}
      {onShare && (
        <button
          onClick={handleShare}
          className={`${verticalButtonStyles} ${buttonPadding} rounded-full transition-all ${
            isVertical ? 'text-white hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
          } ${isVertical ? bgHover : 'hover:bg-slate-100'}`}
          aria-label="Share"
        >
          <ShareIcon className={iconSize} />
          {showLabels && <span className={`${textSize} font-medium`}>Share</span>}
        </button>
      )}
    </div>
  );
}

export default EngagementButtons;
