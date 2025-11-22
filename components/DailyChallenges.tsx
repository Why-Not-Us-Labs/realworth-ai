
'use client';

import React, { useMemo } from 'react';
import { AppraisalResult } from '@/lib/types';

interface DailyChallengesProps {
  history: AppraisalResult[];
  currentStreak: number;
  longestStreak: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  goal: number;
  reward: string;
  completed: boolean;
}

// Streak milestones with rewards
const streakMilestones = [
  { days: 3, reward: "Hot Streak!", icon: "🔥", color: "from-orange-500 to-red-500" },
  { days: 7, reward: "Week Warrior!", icon: "⚔️", color: "from-purple-500 to-indigo-500" },
  { days: 14, reward: "Fortnight Fighter!", icon: "🛡️", color: "from-blue-500 to-cyan-500" },
  { days: 30, reward: "Monthly Master!", icon: "🏆", color: "from-yellow-500 to-amber-500" },
  { days: 60, reward: "Treasure Titan!", icon: "👑", color: "from-emerald-500 to-teal-500" },
  { days: 100, reward: "Legendary Hunter!", icon: "💎", color: "from-pink-500 to-rose-500" },
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

    // Get unique categories this week
    const weekCategories = new Set(weekItems.map(item => item.category));

    // Calculate high-value items ($500+)
    const highValueItems = history.filter(item =>
      (item.priceRange.low + item.priceRange.high) / 2 >= 500
    );

    const challengeList: Challenge[] = [
      {
        id: 'daily-treasure',
        title: 'Daily Discovery',
        description: 'Appraise 1 item today',
        icon: '🎯',
        progress: Math.min(todayItems.length, 1),
        goal: 1,
        reward: '+1 Streak Day',
        completed: todayItems.length >= 1
      },
      {
        id: 'triple-threat',
        title: 'Triple Threat',
        description: 'Appraise 3 items today',
        icon: '⚡',
        progress: Math.min(todayItems.length, 3),
        goal: 3,
        reward: 'Speed Demon Badge',
        completed: todayItems.length >= 3
      },
      {
        id: 'category-explorer',
        title: 'Category Explorer',
        description: 'Find items in 5 different categories',
        icon: '🗺️',
        progress: Math.min(weekCategories.size, 5),
        goal: 5,
        reward: 'Explorer Badge',
        completed: weekCategories.size >= 5
      },
      {
        id: 'high-roller',
        title: 'High Roller',
        description: 'Find an item worth $500+',
        icon: '💰',
        progress: Math.min(highValueItems.length, 1),
        goal: 1,
        reward: 'Big Find Badge',
        completed: highValueItems.length >= 1
      },
      {
        id: 'week-warrior',
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: '⚔️',
        progress: Math.min(currentStreak, 7),
        goal: 7,
        reward: 'Week Warrior Badge',
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
    <div className="mb-8">
      {/* Streak Progress to Next Milestone */}
      {currentStreak > 0 && nextMilestone && currentStreak < nextMilestone.days && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">
              Next Milestone: {nextMilestone.reward}
            </span>
            <span className="text-2xl">{nextMilestone.icon}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mb-1">
            <div
              className={`bg-gradient-to-r ${nextMilestone.color} h-3 rounded-full transition-all duration-500`}
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
              className={`bg-gradient-to-r ${milestone.color} text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap`}
            >
              <span>{milestone.icon}</span>
              {milestone.reward}
            </div>
          ))}
        </div>
      )}

      {/* Daily Challenges */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-xl">🎮</span> Daily Challenges
        </h3>
        <div className="space-y-3">
          {challenges.map(challenge => (
            <div
              key={challenge.id}
              className={`p-3 rounded-lg transition-all ${
                challenge.completed
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-slate-50 border border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{challenge.icon}</span>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-semibold text-sm ${
                      challenge.completed ? 'text-emerald-700' : 'text-slate-700'
                    }`}>
                      {challenge.title}
                      {challenge.completed && <span className="ml-1">✓</span>}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      challenge.completed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {challenge.reward}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{challenge.description}</p>
                  {!challenge.completed && (
                    <div className="mt-2">
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-teal-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(challenge.progress / challenge.goal) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
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
