'use client';

import React, { useState } from 'react';
import { Collection, AppraisalResult } from '@/lib/types';

interface CollectionDashboardProps {
  collection: Collection;
  onAddItem: () => void;
  onEditCollection: () => void;
  onShare: () => void;
  onItemClick: (item: AppraisalResult) => void;
  onBack: () => void;
  isOwner?: boolean;
}

export const CollectionDashboard: React.FC<CollectionDashboardProps> = ({
  collection,
  onAddItem,
  onEditCollection,
  onShare,
  onItemClick,
  onBack,
  isOwner = true,
}) => {
  const [showShareModal, setShowShareModal] = useState(false);

  const items = collection.items || [];
  const itemCount = items.length;
  const expectedCount = collection.expectedCount || 0;
  const progressPercentage = expectedCount
    ? Math.min(100, Math.round((itemCount / expectedCount) * 100))
    : 0;

  const totalValueLow = items.reduce((sum, item) => sum + item.priceRange.low, 0);
  const totalValueHigh = items.reduce((sum, item) => sum + item.priceRange.high, 0);

  // Calculate collection premium (complete sets are worth more)
  const collectionPremium = expectedCount && itemCount === expectedCount ? 0.15 : 0;
  const premiumValueLow = Math.round(totalValueLow * (1 + collectionPremium));
  const premiumValueHigh = Math.round(totalValueHigh * (1 + collectionPremium));

  const formatPrice = (amount: number) => `$${amount.toLocaleString()}`;

  const getVisibilityLabel = () => {
    switch (collection.visibility) {
      case 'public':
        return 'Public';
      case 'unlisted':
        return 'Unlisted (Link only)';
      default:
        return 'Private';
    }
  };

  const copyShareLink = () => {
    const baseUrl = window.location.origin;
    const link = collection.shareToken
      ? `${baseUrl}/collection/${collection.shareToken}`
      : `${baseUrl}/collection/${collection.id}`;
    navigator.clipboard.writeText(link);
    setShowShareModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-slate-500 hover:text-slate-700 mb-4 transition"
        >
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Collections
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{collection.name}</h1>
            {collection.description && (
              <p className="text-slate-500 mt-1">{collection.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
              {collection.category && (
                <span className="bg-slate-100 px-2 py-1 rounded">{collection.category}</span>
              )}
              <span>{getVisibilityLabel()}</span>
            </div>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <button
                onClick={onShare}
                className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                Share
              </button>
              <button
                onClick={onEditCollection}
                className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Progress */}
        {expectedCount > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">Progress</p>
            <p className="text-2xl font-bold text-slate-900">
              {itemCount} / {expectedCount}
            </p>
            <div className="mt-2">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    progressPercentage === 100 ? 'bg-green-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {progressPercentage}% complete
                {expectedCount - itemCount > 0 && ` - ${expectedCount - itemCount} missing`}
              </p>
            </div>
          </div>
        )}

        {/* Current Value */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Current Value</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatPrice(totalValueLow)} - {formatPrice(totalValueHigh)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{itemCount} items appraised</p>
        </div>

        {/* Complete Set Value */}
        {expectedCount > 0 && collectionPremium > 0 && (
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 shadow-sm border border-teal-200">
            <p className="text-sm text-teal-700 mb-1">Complete Set Value</p>
            <p className="text-2xl font-bold text-teal-900">
              {formatPrice(premiumValueLow)} - {formatPrice(premiumValueHigh)}
            </p>
            <p className="text-xs text-teal-600 mt-1">+15% collection premium</p>
          </div>
        )}

        {/* Goal Date */}
        {collection.goalDate && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">Goal Date</p>
            <p className="text-lg font-semibold text-slate-900">
              {new Date(collection.goalDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        )}
      </div>

      {/* Add Item Button */}
      {isOwner && (
        <button
          onClick={onAddItem}
          className="w-full mb-6 py-3 border-2 border-dashed border-teal-300 rounded-xl text-teal-600 font-medium hover:bg-teal-50 hover:border-teal-400 transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item to Collection
        </button>
      )}

      {/* Items Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick(item)}
              className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-teal-300 transition text-left"
            >
              <div className="aspect-square bg-slate-100">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.itemName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-slate-900 truncate">{item.itemName}</p>
                <p className="text-xs text-teal-600 mt-1">
                  {formatPrice(item.priceRange.low)} - {formatPrice(item.priceRange.high)}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-slate-500">No items in this collection yet</p>
          {isOwner && (
            <button
              onClick={onAddItem}
              className="mt-3 text-teal-600 font-medium hover:text-teal-700"
            >
              Add your first item
            </button>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Share Collection</h3>
            <p className="text-sm text-slate-500 mb-4">
              {collection.visibility === 'private'
                ? 'This collection is private. Change visibility to share.'
                : 'Copy the link below to share this collection.'}
            </p>
            {collection.visibility !== 'private' && (
              <button
                onClick={copyShareLink}
                className="w-full py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
              >
                Copy Link
              </button>
            )}
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-2 py-2 text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
