'use client';

import React from 'react';
import { CollectionSummary } from '@/lib/types';

interface CollectionCardProps {
  collection: CollectionSummary;
  onClick: () => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({ collection, onClick }) => {
  const progressPercentage = collection.expectedCount
    ? Math.min(100, Math.round((collection.itemCount / collection.expectedCount) * 100))
    : 0;

  const formatPrice = (low: number, high: number) => {
    if (low === 0 && high === 0) return 'No items yet';
    return `$${low.toLocaleString()} - $${high.toLocaleString()}`;
  };

  const getVisibilityIcon = () => {
    switch (collection.visibility) {
      case 'public':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'unlisted':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden text-left border border-slate-200 hover:border-teal-300"
    >
      {/* Thumbnail or placeholder */}
      <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative">
        {collection.thumbnailUrl ? (
          <img
            src={collection.thumbnailUrl}
            alt={collection.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        )}

        {/* Category badge */}
        {collection.category && (
          <span className="absolute top-2 left-2 bg-white/90 text-slate-700 text-xs font-medium px-2 py-1 rounded">
            {collection.category}
          </span>
        )}

        {/* Visibility indicator */}
        <span className="absolute top-2 right-2 text-slate-500 bg-white/90 p-1 rounded">
          {getVisibilityIcon()}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-slate-900 truncate">{collection.name}</h3>

        {collection.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{collection.description}</p>
        )}

        {/* Progress bar */}
        {collection.expectedCount && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{collection.itemCount} / {collection.expectedCount} items</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progressPercentage === 100 ? 'bg-green-500' : 'bg-teal-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Value display */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-sm font-medium text-slate-900">
            {formatPrice(collection.totalValueLow, collection.totalValueHigh)}
          </p>
          {!collection.expectedCount && (
            <p className="text-xs text-slate-500">{collection.itemCount} items</p>
          )}
        </div>

        {/* Goal date */}
        {collection.goalDate && (
          <p className="text-xs text-slate-500 mt-2">
            Goal: {new Date(collection.goalDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </button>
  );
};
