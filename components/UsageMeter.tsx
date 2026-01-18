'use client';

import React from 'react';
import { SparklesIcon } from '@/components/icons';

interface UsageMeterProps {
  used: number;
  limit: number;
  credits?: number;
  resetAt?: string | null;
  isPro?: boolean;
  onUpgrade?: () => void;
}

function getResetCountdown(resetAt: string | null): string | null {
  if (!resetAt) return null;

  const resetDate = new Date(resetAt);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return '1 day';
  if (diffDays <= 7) return `${diffDays} days`;
  if (diffDays <= 14) return '1 week';
  if (diffDays <= 21) return '2 weeks';
  if (diffDays <= 28) return '3 weeks';
  return `${Math.ceil(diffDays / 7)} weeks`;
}

export default function UsageMeter({ used, limit, credits = 0, resetAt, isPro, onUpgrade }: UsageMeterProps) {
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
  const resetCountdown = getResetCountdown(resetAt || null);

  // Progress bar segments
  const freeUsedPercent = Math.min((used / limit) * 100, 100);
  const freeRemainingPercent = (freeRemaining / limit) * 100;
  // Credits extend beyond the free limit bar
  const creditPercent = hasCredits ? Math.min((credits / limit) * 100, 50) : 0;

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">
            {totalAvailable} appraisal{totalAvailable !== 1 ? 's' : ''} available
          </span>
          {hasCredits && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" />
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
        {/* Used portion (teal) */}
        <div
          className="h-full bg-teal-500 transition-all duration-300"
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

      {/* Detailed breakdown */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span>{used}/{limit} free used</span>
          {hasCredits && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-amber-600">{credits} purchased</span>
            </>
          )}
        </div>
        {resetCountdown && (
          <span className="text-slate-400">
            Resets in {resetCountdown}
          </span>
        )}
      </div>

      {/* Status messages */}
      {isExhausted && !hasCredits && (
        <p className="text-xs text-red-600">
          You&apos;ve used all free appraisals.{' '}
          {onUpgrade && (
            <button onClick={onUpgrade} className="underline font-medium">
              Get more
            </button>
          )}
        </p>
      )}
    </div>
  );
}
