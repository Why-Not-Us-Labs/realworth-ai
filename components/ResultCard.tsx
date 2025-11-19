
'use client';

import React, { useContext, useEffect } from 'react';
import { AppraisalResult } from '@/lib/types';
import { SparklesIcon } from './icons';
import { AuthContext } from './contexts/AuthContext';

interface ResultCardProps {
  result: AppraisalResult;
  onStartNew: () => void;
  setHistory: React.Dispatch<React.SetStateAction<AppraisalResult[]>>;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onStartNew, setHistory }) => {
  const { user, signIn } = useContext(AuthContext);

  // Effect to auto-save the current appraisal once the user signs in
  useEffect(() => {
    if (user) {
      // Check if the current result is already in the history to avoid duplicates
      setHistory(prevHistory => {
        if (!prevHistory.some(item => item.id === result.id)) {
          return [result, ...prevHistory];
        }
        return prevHistory;
      });
    }
  }, [user, result, setHistory]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: result.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isGreatFind = result.priceRange.high >= 500;

  return (
    <div className="p-6 sm:p-8">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 relative">
          <img src={result.image} alt={result.itemName} className="w-full h-full object-cover" />
          {isGreatFind && (
            <div className="absolute top-4 left-4 bg-amber-400 text-amber-900 text-sm font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
              Great Find!
            </div>
          )}
           <div className="absolute top-4 right-4 bg-black/40 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
              {result.category}
            </div>
        </div>
        <div className="flex flex-col h-full">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{result.itemName}</h2>
          {result.author && result.author.toLowerCase() !== 'n/a' && (
            <p className="text-lg text-slate-600 -mt-1">by {result.author}</p>
          )}
          <p className="text-lg text-slate-500 mt-1">{result.era}</p>
          
          <div className="my-6 p-6 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Estimated Value</p>
            <p className="gradient-text text-4xl sm:text-5xl font-black">
              {formatCurrency(result.priceRange.low)} - {formatCurrency(result.priceRange.high)}
            </p>
          </div>

          {!user && (
            <div className="mb-6 p-4 rounded-lg bg-teal-50 border border-teal-200 text-center">
              <h4 className="font-bold text-teal-800">Like what you see?</h4>
              <p className="text-sm text-teal-700 mt-1">Sign in to save this appraisal and build your collection.</p>
              <button onClick={signIn} className="mt-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                Sign in with Google
              </button>
            </div>
          )}

          <div className="space-y-4 text-slate-600 flex-grow">
            <div>
              <h4 className="font-semibold text-slate-800">AI-Generated Description</h4>
              <p className="whitespace-pre-wrap">{result.description}</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Valuation Rationale</h4>
              <p className="whitespace-pre-wrap">{result.reasoning}</p>
            </div>
          </div>
          
          <button
            onClick={onStartNew}
            className="mt-8 w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all"
          >
            Appraise Another Item
          </button>
        </div>
      </div>
    </div>
  );
};
