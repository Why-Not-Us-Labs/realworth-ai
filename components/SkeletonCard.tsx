'use client';

import React from 'react';

interface SkeletonCardProps {
  variant?: 'card' | 'grid';
}

export function SkeletonCard({ variant = 'card' }: SkeletonCardProps) {
  if (variant === 'grid') {
    return (
      <div className="relative aspect-square bg-slate-100 overflow-hidden animate-pulse">
        <div className="absolute inset-0 shimmer" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Image placeholder */}
      <div className="relative aspect-square bg-slate-100 overflow-hidden">
        <div className="absolute inset-0 shimmer" />
        {/* Value badge placeholder */}
        <div className="absolute top-3 right-3 h-7 w-20 bg-slate-200 rounded-full" />
        {/* Category badge placeholder */}
        <div className="absolute bottom-3 left-3 h-5 w-16 bg-slate-200 rounded-full" />
      </div>

      {/* Content placeholder */}
      <div className="p-4">
        {/* Title */}
        <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
        {/* Era */}
        <div className="h-4 w-1/3 bg-slate-100 rounded mb-3" />

        {/* Owner & Time */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200" />
            <div className="h-3 w-16 bg-slate-200 rounded" />
          </div>
          <div className="h-3 w-10 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  variant?: 'card' | 'grid';
}

export function SkeletonGrid({ count = 6, variant = 'card' }: SkeletonGridProps) {
  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} variant="grid" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant="card" />
      ))}
    </div>
  );
}

export default SkeletonCard;
