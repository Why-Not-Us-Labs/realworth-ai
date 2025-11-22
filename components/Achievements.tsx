
'use client';

import React from 'react';
import { AppraisalResult } from '@/lib/types';
import {
  TargetIcon,
  GemIcon,
  TrophyIcon,
  CrownIcon,
  DollarSignIcon,
  TrendingUpIcon,
  StarIcon,
  GridIcon,
  ShareIcon,
  AwardIcon,
  CheckIcon
} from './icons';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  total?: number;
}

interface AchievementsProps {
  history: AppraisalResult[];
}

function calculateAchievements(history: AppraisalResult[]): Achievement[] {
  const totalItems = history.length;
  const totalValue = history.reduce((sum, item) => sum + (item.priceRange.low + item.priceRange.high) / 2, 0);
  const maxValue = history.reduce((max, item) => Math.max(max, (item.priceRange.low + item.priceRange.high) / 2), 0);
  const categories = new Set(history.map(item => item.category)).size;
  const publicItems = history.filter(item => item.isPublic).length;

  return [
    {
      id: 'first-treasure',
      name: 'First Discovery',
      description: 'Appraise your first item',
      icon: <TargetIcon className="w-5 h-5" />,
      unlocked: totalItems >= 1,
    },
    {
      id: 'five-treasures',
      name: 'Treasure Hunter',
      description: 'Appraise 5 items',
      icon: <GemIcon className="w-5 h-5" />,
      unlocked: totalItems >= 5,
      progress: Math.min(totalItems, 5),
      total: 5,
    },
    {
      id: 'ten-treasures',
      name: 'Expert Appraiser',
      description: 'Appraise 10 items',
      icon: <TrophyIcon className="w-5 h-5" />,
      unlocked: totalItems >= 10,
      progress: Math.min(totalItems, 10),
      total: 10,
    },
    {
      id: 'twenty-five-treasures',
      name: 'Master Collector',
      description: 'Appraise 25 items',
      icon: <CrownIcon className="w-5 h-5" />,
      unlocked: totalItems >= 25,
      progress: Math.min(totalItems, 25),
      total: 25,
    },
    {
      id: 'hundred-dollar',
      name: 'Nice Find',
      description: 'Find an item worth $100+',
      icon: <DollarSignIcon className="w-5 h-5" />,
      unlocked: maxValue >= 100,
    },
    {
      id: 'five-hundred-dollar',
      name: 'Valuable Discovery',
      description: 'Find an item worth $500+',
      icon: <DollarSignIcon className="w-5 h-5" />,
      unlocked: maxValue >= 500,
    },
    {
      id: 'thousand-dollar',
      name: 'Jackpot',
      description: 'Find an item worth $1,000+',
      icon: <StarIcon className="w-5 h-5" />,
      unlocked: maxValue >= 1000,
    },
    {
      id: 'five-thousand-dollar',
      name: 'Hidden Fortune',
      description: 'Find an item worth $5,000+',
      icon: <GemIcon className="w-5 h-5" />,
      unlocked: maxValue >= 5000,
    },
    {
      id: 'total-thousand',
      name: 'Building Wealth',
      description: 'Accumulate $1,000 total value',
      icon: <TrendingUpIcon className="w-5 h-5" />,
      unlocked: totalValue >= 1000,
    },
    {
      id: 'total-five-thousand',
      name: 'Treasure Vault',
      description: 'Accumulate $5,000 total value',
      icon: <TrendingUpIcon className="w-5 h-5" />,
      unlocked: totalValue >= 5000,
    },
    {
      id: 'category-explorer',
      name: 'Category Explorer',
      description: 'Appraise items in 3 categories',
      icon: <GridIcon className="w-5 h-5" />,
      unlocked: categories >= 3,
      progress: Math.min(categories, 3),
      total: 3,
    },
    {
      id: 'category-master',
      name: 'Diverse Collector',
      description: 'Appraise items in 5 categories',
      icon: <GridIcon className="w-5 h-5" />,
      unlocked: categories >= 5,
      progress: Math.min(categories, 5),
      total: 5,
    },
    {
      id: 'first-share',
      name: 'Show & Tell',
      description: 'Share your first treasure',
      icon: <ShareIcon className="w-5 h-5" />,
      unlocked: publicItems >= 1,
    },
    {
      id: 'social-butterfly',
      name: 'Social Butterfly',
      description: 'Share 5 treasures publicly',
      icon: <ShareIcon className="w-5 h-5" />,
      unlocked: publicItems >= 5,
      progress: Math.min(publicItems, 5),
      total: 5,
    },
  ];
}

export const Achievements: React.FC<AchievementsProps> = ({ history }) => {
  const achievements = calculateAchievements(history);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AwardIcon className="w-4 h-4 text-slate-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Achievements</h3>
        </div>
        <span className="text-xs text-slate-500">
          {unlockedCount}/{achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative p-3 rounded-lg border transition-all ${
              achievement.unlocked
                ? 'border-teal-200 bg-teal-50'
                : 'border-slate-100 bg-slate-50 opacity-50'
            }`}
            title={achievement.description}
          >
            <div className="text-center">
              <div className={`mb-1.5 flex justify-center ${
                achievement.unlocked ? 'text-teal-600' : 'text-slate-400'
              }`}>
                {achievement.icon}
              </div>
              <p className={`text-xs font-medium truncate ${
                achievement.unlocked ? 'text-slate-800' : 'text-slate-500'
              }`}>
                {achievement.name}
              </p>
              {achievement.progress !== undefined && !achievement.unlocked && (
                <div className="mt-1.5">
                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${(achievement.progress / (achievement.total || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {achievement.progress}/{achievement.total}
                  </p>
                </div>
              )}
              {achievement.unlocked && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
