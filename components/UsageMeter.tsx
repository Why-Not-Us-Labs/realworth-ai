'use client';

import React from 'react';
import { SparklesIcon } from '@/components/icons';

interface UsageMeterProps {
  used: number;
  limit: number;
  credits?: number;
  isPro?: boolean;
  onUpgrade?: () => void;
}

export default function UsageMeter({ used, limit, credits = 0, isPro, onUpgrade }: UsageMeterProps) {
  if (isPro) {
    return (
      <div className="flex items-center gap-2 text-sm text-teal-600">
        <SparklesIcon className="w-4 h-4" />
        <span className="font-medium">Unlimited appraisals</span>
      </div>
    );
  }

  // Total available = remaining free + purchased credits
  const freeRemaining = Math.max(limit - used, 0);
  const totalAvailable = freeRemaining + credits;
  const isExhausted = totalAvailable === 0;
  const hasCredits = credits > 0;

  // Progress bar segments
  const freeUsedPercent = Math.min((used / limit) * 100, 100);
  const freeRemainingPercent = (freeRemaining / limit) * 100;
  // Credits extend beyond the free limit bar
  const creditPercent = hasCredits ? Math.min((credits / limit) * 100, 50) : 0; // Cap at 50% visual width

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {hasCredits ? (
            <span className="font-medium text-gray-700">
              {totalAvailable} appraisal{totalAvailable !== 1 ? 's' : ''} available
            </span>
          ) : (
            <span className={`font-medium ${isExhausted ? 'text-red-600' : freeRemaining <= 1 ? 'text-amber-600' : 'text-gray-700'}`}>
              {used}/{limit} free used
            </span>
          )}
          {hasCredits && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8.5 7.5a1.5 1.5 0 113 0v3a1.5 1.5 0 01-3 0v-3zm1.5 7a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              {credits} credit{credits !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!isPro && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="text-teal-600 hover:text-teal-700 font-medium text-xs"
          >
            Go Pro
          </button>
        )}
      </div>

      {/* Progress bar with segments */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
        {/* Used portion (teal or red if exhausted) */}
        <div
          className={`h-full transition-all duration-300 ${
            isExhausted && !hasCredits ? 'bg-red-500' : 'bg-teal-500'
          }`}
          style={{ width: `${freeUsedPercent}%` }}
        />
        {/* Remaining free portion (lighter teal) */}
        {freeRemaining > 0 && (
          <div
            className="h-full bg-teal-200 transition-all duration-300"
            style={{ width: `${freeRemainingPercent}%` }}
          />
        )}
        {/* Credits portion (gold/amber) */}
        {hasCredits && (
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
            style={{ width: `${creditPercent}%` }}
          />
        )}
      </div>

      {/* Status messages */}
      {isExhausted && !hasCredits && (
        <p className="text-xs text-red-600">
          You&apos;ve reached your monthly limit.{' '}
          {onUpgrade && (
            <button onClick={onUpgrade} className="underline font-medium">
              Upgrade to Pro
            </button>
          )}
        </p>
      )}
      {freeRemaining === 1 && !hasCredits && (
        <p className="text-xs text-amber-600">
          Only 1 free appraisal left this month
        </p>
      )}
      {hasCredits && freeRemaining === 0 && (
        <p className="text-xs text-amber-600">
          Free appraisals used. {credits} paid credit{credits !== 1 ? 's' : ''} remaining.
        </p>
      )}
    </div>
  );
}
