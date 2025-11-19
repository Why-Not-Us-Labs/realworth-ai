
'use client';

import React from 'react';

interface GamificationStatsProps {
  itemCount: number;
  totalValue: number;
  currency: string;
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

export const GamificationStats: React.FC<GamificationStatsProps> = ({ itemCount, totalValue, currency }) => {
  return (
    <div className="mb-8 text-center">
      <h3 className="text-2xl font-bold mb-4 text-slate-800">Your Treasure Chest</h3>
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-4xl font-black gradient-text">{itemCount}</p>
          <p className="text-slate-500">Items Appraised</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-4xl font-black gradient-text">{formatCurrency(totalValue, currency)}</p>
          <p className="text-slate-500">Potential Value</p>
        </div>
      </div>
    </div>
  );
};
