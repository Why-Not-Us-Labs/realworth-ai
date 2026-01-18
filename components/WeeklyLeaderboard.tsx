'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrophyIcon } from '@/components/icons';

type LeaderboardEntry = {
  userId: string;
  name: string;
  picture: string;
  username?: string;
  totalValue: number;
  findsCount: number;
  rank: number;
};

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${Math.round(amount)}`;
}

function getRankBadge(rank: number): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return `#${rank}`;
  }
}

export function WeeklyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch('/api/leaderboard/weekly');
        const data = await response.json();
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-white/20 rounded" />
          <div className="h-4 w-32 bg-white/20 rounded" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20" />
              <div className="h-3 w-16 bg-white/20 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return null;
  }

  // Show top 5 in the preview
  const topEntries = leaderboard.slice(0, 5);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrophyIcon className="w-4 h-4 text-amber-300" />
          <span className="text-sm font-semibold text-white/90">Weekly Top Hunters</span>
        </div>
        <Link
          href="/leaderboard"
          className="text-xs text-white/70 hover:text-white transition-colors"
        >
          See all
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {topEntries.map((entry) => (
          <Link
            key={entry.userId}
            href={`/user/${entry.userId}`}
            className="flex-shrink-0 flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-2 py-1.5 transition-colors"
          >
            <span className="text-sm">{getRankBadge(entry.rank)}</span>
            {entry.picture ? (
              <img
                src={entry.picture}
                alt={entry.name}
                className="w-6 h-6 rounded-full border border-white/30"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/30" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate max-w-[80px]">
                {entry.name.split(' ')[0]}
              </p>
              <p className="text-xs text-white/70">
                {formatCurrency(entry.totalValue)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default WeeklyLeaderboard;
