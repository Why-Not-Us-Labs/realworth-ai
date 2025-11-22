
'use client';

import React from 'react';

interface GamificationStatsProps {
  itemCount: number;
  totalValue: number;
  currency: string;
  currentStreak?: number;
  longestStreak?: number;
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
};

export const GamificationStats: React.FC<GamificationStatsProps> = ({
  itemCount,
  totalValue,
  currency,
  currentStreak = 0,
  longestStreak = 0
}) => {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
        {/* Items Count */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
          <p className="text-3xl font-black text-teal-600">{itemCount}</p>
          <p className="text-xs text-slate-500 mt-1">Treasures</p>
        </div>

        {/* Total Value */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(totalValue, currency)}</p>
          <p className="text-xs text-slate-500 mt-1">Total Value</p>
        </div>

        {/* Current Streak */}
        <div className={`p-4 rounded-xl shadow-sm border text-center ${
          currentStreak > 0
            ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'
            : 'bg-white border-slate-200'
        }`}>
          <p className="text-3xl font-black text-orange-500 flex items-center justify-center gap-1">
            {currentStreak > 0 && <span className="text-xl">🔥</span>}
            {currentStreak}
          </p>
          <p className="text-xs text-slate-500 mt-1">Day Streak</p>
        </div>

        {/* Longest Streak */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
          <p className="text-3xl font-black text-purple-600 flex items-center justify-center gap-1">
            {longestStreak > 0 && <span className="text-xl">🏆</span>}
            {longestStreak}
          </p>
          <p className="text-xs text-slate-500 mt-1">Best Streak</p>
        </div>
      </div>

      {/* Streak Motivation */}
      {currentStreak > 0 && (
        <p className="text-center text-sm text-orange-600 mt-3 font-medium">
          {currentStreak === 1 && "Great start! Come back tomorrow to build your streak! 🔥"}
          {currentStreak >= 2 && currentStreak < 7 && `${currentStreak} days strong! Keep it going! 🔥`}
          {currentStreak >= 7 && currentStreak < 30 && `${currentStreak} day streak! You're on fire! 🔥🔥`}
          {currentStreak >= 30 && `${currentStreak} days! LEGENDARY streak! 🔥🔥🔥`}
        </p>
      )}
    </div>
  );
};
