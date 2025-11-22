
'use client';

import React, { useMemo } from 'react';
import { AppraisalResult } from '@/lib/types';
import {
  TargetIcon,
  BoltIcon,
  MapIcon,
  DollarSignIcon,
  SwordIcon,
  FlameIcon,
  ShieldIcon,
  TrophyIcon,
  CrownIcon,
  GemIcon,
  CheckIcon
} from './icons';

interface DailyChallengesProps {
  history: AppraisalResult[];
  currentStreak: number;
  longestStreak: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  goal: number;
  reward: string;
  completed: boolean;
}

// Streak milestones with rewards
const streakMilestones = [
  { days: 3, reward: "Hot Streak", icon: <FlameIcon className="w-3 h-3" />, color: "from-orange-500 to-red-500" },
  { days: 7, reward: "Week Warrior", icon: <SwordIcon className="w-3 h-3" />, color: "from-purple-500 to-indigo-500" },
  { days: 14, reward: "Fortnight Fighter", icon: <ShieldIcon className="w-3 h-3" />, color: "from-blue-500 to-cyan-500" },
  { days: 30, reward: "Monthly Master", icon: <TrophyIcon className="w-3 h-3" />, color: "from-yellow-500 to-amber-500" },
  { days: 60, reward: "Treasure Titan", icon: <CrownIcon className="w-3 h-3" />, color: "from-emerald-500 to-teal-500" },
  { days: 100, reward: "Legendary Hunter", icon: <GemIcon className="w-3 h-3" />, color: "from-pink-500 to-rose-500" },
];

export const DailyChallenges: React.FC<DailyChallengesProps> = ({
  history,
  currentStreak,
  longestStreak
}) => {
  const challenges = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayItems = history.filter(item => {
      const itemDate = new Date(item.timestamp);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate.getTime() === today.getTime();
    });

    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekItems = history.filter(item => new Date(item.timestamp) >= thisWeek);

    const weekCategories = new Set(weekItems.map(item => item.category));

    const highValueItems = history.filter(item =>
      (item.priceRange.low + item.priceRange.high) / 2 >= 500
    );

    const challengeList: Challenge[] = [
      {
        id: 'daily-treasure',
        title: 'Daily Discovery',
        description: 'Appraise 1 item today',
        icon: <TargetIcon className="w-5 h-5 text-slate-600" />,
        progress: Math.min(todayItems.length, 1),
        goal: 1,
        reward: '+1 Streak',
        completed: todayItems.length >= 1
      },
      {
        id: 'triple-threat',
        title: 'Triple Threat',
        description: 'Appraise 3 items today',
        icon: <BoltIcon className="w-5 h-5 text-slate-600" />,
        progress: Math.min(todayItems.length, 3),
        goal: 3,
        reward: 'Speed Badge',
        completed: todayItems.length >= 3
      },
      {
        id: 'category-explorer',
        title: 'Category Explorer',
        description: 'Find items in 5 categories',
        icon: <MapIcon className="w-5 h-5 text-slate-600" />,
        progress: Math.min(weekCategories.size, 5),
        goal: 5,
        reward: 'Explorer Badge',
        completed: weekCategories.size >= 5
      },
      {
        id: 'high-roller',
        title: 'High Roller',
        description: 'Find an item worth $500+',
        icon: <DollarSignIcon className="w-5 h-5 text-slate-600" />,
        progress: Math.min(highValueItems.length, 1),
        goal: 1,
        reward: 'Big Find Badge',
        completed: highValueItems.length >= 1
      },
      {
        id: 'week-warrior',
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: <SwordIcon className="w-5 h-5 text-slate-600" />,
        progress: Math.min(currentStreak, 7),
        goal: 7,
        reward: 'Warrior Badge',
        completed: longestStreak >= 7
      },
    ];

    return challengeList;
  }, [history, currentStreak, longestStreak]);

  const nextMilestone = useMemo(() => {
    return streakMilestones.find(m => currentStreak < m.days) || streakMilestones[streakMilestones.length - 1];
  }, [currentStreak]);

  const achievedMilestones = useMemo(() => {
    return streakMilestones.filter(m => longestStreak >= m.days);
  }, [longestStreak]);

  return (
    <div className="mb-6">
      {/* Streak Progress to Next Milestone */}
      {currentStreak > 0 && nextMilestone && currentStreak < nextMilestone.days && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Next: {nextMilestone.reward}
            </span>
            <span className="text-slate-400">{nextMilestone.icon}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
            <div
              className={`bg-gradient-to-r ${nextMilestone.color} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${(currentStreak / nextMilestone.days) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 text-right">
            {currentStreak}/{nextMilestone.days} days
          </p>
        </div>
      )}

      {/* Achieved Milestones */}
      {achievedMilestones.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {achievedMilestones.map(milestone => (
            <div
              key={milestone.days}
              className={`bg-gradient-to-r ${milestone.color} text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap`}
            >
              {milestone.icon}
              {milestone.reward}
            </div>
          ))}
        </div>
      )}

      {/* Daily Challenges */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-4 text-sm">
          Daily Challenges
        </h3>
        <div className="space-y-3">
          {challenges.map(challenge => (
            <div
              key={challenge.id}
              className={`p-3 rounded-lg transition-all ${
                challenge.completed
                  ? 'bg-emerald-50 border border-emerald-100'
                  : 'bg-slate-50 border border-slate-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={challenge.completed ? 'text-emerald-500' : ''}>
                  {challenge.icon}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium text-sm flex items-center gap-1 ${
                      challenge.completed ? 'text-emerald-700' : 'text-slate-700'
                    }`}>
                      {challenge.title}
                      {challenge.completed && <CheckIcon className="w-3.5 h-3.5" />}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      challenge.completed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {challenge.reward}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{challenge.description}</p>
                  {!challenge.completed && (
                    <div className="mt-2">
                      <div className="w-full bg-slate-200 rounded-full h-1">
                        <div
                          className="bg-teal-500 h-1 rounded-full transition-all"
                          style={{ width: `${(challenge.progress / challenge.goal) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {challenge.progress}/{challenge.goal}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
