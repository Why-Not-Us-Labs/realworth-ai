
'use client';

import React from 'react';
import { AppraisalResult } from '@/types';

interface HistoryListProps {
  history: AppraisalResult[];
  onSelect: (item: AppraisalResult) => void;
}

const HistoryItem: React.FC<{ item: AppraisalResult; onSelect: () => void }> = ({ item, onSelect }) => {
  const imageUrl = item.image;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: item.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <button onClick={onSelect} className="w-full text-left p-4 rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 flex items-center gap-4 border border-slate-200">
      <div className="w-16 h-16 rounded-lg bg-slate-200 flex-shrink-0 relative overflow-hidden">
        <img src={imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 right-0 px-1.5 py-0.5 bg-black/40 text-white text-xs font-semibold backdrop-blur-sm rounded-tl-md">
            {item.category}
        </div>
      </div>
      <div className="flex-grow overflow-hidden">
        <h4 className="font-bold text-slate-800 truncate">{item.itemName}</h4>
        <p className="text-sm text-slate-500">{item.era}</p>
        <p className="text-md font-semibold text-teal-600 mt-1">
          {formatCurrency(item.priceRange.low)} - {formatCurrency(item.priceRange.high)}
        </p>
      </div>
    </button>
  );
};

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold px-2 text-slate-800">Appraisal History</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {history.map((item) => (
          <HistoryItem key={item.id} item={item} onSelect={() => onSelect(item)} />
        ))}
      </div>
    </div>
  );
};
