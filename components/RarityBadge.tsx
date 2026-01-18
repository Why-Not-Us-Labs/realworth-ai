'use client';

import React from 'react';

type RarityTier = 'legendary' | 'rare' | 'uncommon' | 'common';

type RarityBadgeProps = {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
};

function getRarityTier(score: number | null | undefined): RarityTier {
  if (score === null || score === undefined) return 'common';
  if (score >= 9) return 'legendary';
  if (score >= 7) return 'rare';
  if (score >= 4) return 'uncommon';
  return 'common';
}

function getRarityConfig(tier: RarityTier) {
  switch (tier) {
    case 'legendary':
      return {
        label: 'Legendary',
        bgColor: 'bg-gradient-to-r from-amber-400 to-yellow-500',
        textColor: 'text-amber-900',
        borderColor: 'border-amber-300',
        glowColor: 'shadow-amber-400/50',
        icon: '✨',
      };
    case 'rare':
      return {
        label: 'Rare',
        bgColor: 'bg-gradient-to-r from-purple-500 to-violet-600',
        textColor: 'text-white',
        borderColor: 'border-purple-400',
        glowColor: 'shadow-purple-500/50',
        icon: '💎',
      };
    case 'uncommon':
      return {
        label: 'Uncommon',
        bgColor: 'bg-gradient-to-r from-blue-400 to-cyan-500',
        textColor: 'text-white',
        borderColor: 'border-blue-300',
        glowColor: 'shadow-blue-400/50',
        icon: '🔹',
      };
    case 'common':
    default:
      return {
        label: 'Common',
        bgColor: 'bg-slate-200',
        textColor: 'text-slate-600',
        borderColor: 'border-slate-300',
        glowColor: '',
        icon: '',
      };
  }
}

export function RarityBadge({ score, size = 'sm', showLabel = true, className = '' }: RarityBadgeProps) {
  const tier = getRarityTier(score);

  // Don't show badge for common items
  if (tier === 'common') return null;

  const config = getRarityConfig(tier);

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-bold uppercase tracking-wide rounded-full
        ${config.bgColor} ${config.textColor} ${sizeClasses[size]}
        ${tier === 'legendary' ? `shadow-lg ${config.glowColor}` : ''}
        ${className}
      `}
    >
      {config.icon && <span>{config.icon}</span>}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// Compact version for tight spaces (just icon + glow)
export function RarityIndicator({ score, className = '' }: { score: number | null | undefined; className?: string }) {
  const tier = getRarityTier(score);
  if (tier === 'common') return null;

  const config = getRarityConfig(tier);

  return (
    <span
      className={`
        inline-flex items-center justify-center w-5 h-5 rounded-full text-xs
        ${config.bgColor} ${config.textColor}
        ${tier === 'legendary' ? `shadow-md ${config.glowColor}` : ''}
        ${className}
      `}
      title={config.label}
    >
      {config.icon || tier.charAt(0).toUpperCase()}
    </span>
  );
}

export default RarityBadge;
