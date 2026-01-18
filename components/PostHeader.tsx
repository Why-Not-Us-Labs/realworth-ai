'use client';

import React from 'react';
import Link from 'next/link';
import { timeAgo } from '@/lib/formatters';

type PostHeaderProps = {
  userId: string;
  userName: string;
  userPicture: string | null;
  timestamp: string;
  onMenuClick?: () => void;
};

export function PostHeader({ userId, userName, userPicture, timestamp, onMenuClick }: PostHeaderProps) {
  const displayName = userName?.split(' ')[0]?.toLowerCase() || 'anonymous';

  return (
    <div className="flex items-center justify-between px-3 py-2 h-14">
      <Link href={`/user/${userId}`} className="flex items-center gap-3 min-w-0">
        {userPicture ? (
          <img
            src={userPicture}
            alt={userName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            <span className="text-slate-500 text-sm font-medium">
              {userName?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-slate-900 truncate">
            {displayName}
          </span>
          <span className="text-slate-400 text-sm flex-shrink-0">
            {timeAgo(timestamp)}
          </span>
        </div>
      </Link>

      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="p-2 -mr-2 text-slate-600 hover:text-slate-900 transition-colors"
          aria-label="More options"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default PostHeader;
