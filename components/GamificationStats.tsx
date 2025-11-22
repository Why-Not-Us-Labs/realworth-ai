
'use client';

import React from 'react';
import { GemIcon, DollarSignIcon, FlameIcon, TrophyIcon } from './icons';

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
    <div className="mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Items Count */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <GemIcon className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-medium text-slate-500">Items</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{itemCount}</p>
        </div>

        {/* Total Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSignIcon className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-slate-500">Value</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalValue, currency)}</p>
        </div>

        {/* Current Streak */}
        <div className={`p-4 rounded-xl border ${
          currentStreak > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <FlameIcon className={`w-4 h-4 ${currentStreak > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
            <span className="text-xs font-medium text-slate-500">Streak</span>
          </div>
          <p className={`text-2xl font-bold ${currentStreak > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
            {currentStreak}
          </p>
        </div>

        {/* Best Streak */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <TrophyIcon className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-slate-500">Best</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{longestStreak}</p>
        </div>
      </div>

      {/* Streak encouragement */}
      {currentStreak > 0 && (
        <p className="text-center text-xs text-slate-500 mt-3">
          {currentStreak === 1 && "Great start! Come back tomorrow to build your streak."}
          {currentStreak >= 2 && currentStreak < 7 && `${currentStreak} days strong. Keep it going!`}
          {currentStreak >= 7 && currentStreak < 30 && `${currentStreak} day streak! You're on fire.`}
          {currentStreak >= 30 && `${currentStreak} days! Legendary streak.`}
        </p>
      )}
    </div>
  );
};
