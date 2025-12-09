'use client';

import React from 'react';
import Link from 'next/link';
import { AppraisalResult } from '@/lib/types';

interface TreasureGridProps {
  items: AppraisalResult[];
  emptyMessage?: string;
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function TreasureGrid({ items, emptyMessage = 'No treasures yet' }: TreasureGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
      {items.map((item) => {
        const avgValue = (item.priceRange.low + item.priceRange.high) / 2;

        return (
          <Link
            key={item.id}
            href={`/treasure/${item.id}`}
            className="relative aspect-square bg-slate-100 overflow-hidden group"
          >
            {/* Image */}
            <img
              src={item.image}
              alt={item.itemName}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 group-active:scale-100"
              loading="lazy"
            />

            {/* Hover/Tap overlay with value */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 group-active:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100">
              <div className="text-white text-center transform scale-90 group-hover:scale-100 transition-transform">
                <p className="font-bold text-sm sm:text-base drop-shadow-lg">
                  {formatCurrency(avgValue, item.currency)}
                </p>
              </div>
            </div>

            {/* Public indicator */}
            {item.isPublic && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default TreasureGrid;
