
'use client';

import React, { useState, useEffect } from 'react';
import { getRandomFacts } from '@/lib/funFacts';

const loadingMessages = [
  "Analyzing item details...",
  "Consulting with digital archivists...",
  "Comparing with market data...",
  "Researching comparable sales...",
  "Checking auction records...",
  "Generating final image...",
  "Calculating estimated value...",
  "Finalizing appraisal...",
];

export const Loader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [facts] = useState(() => getRandomFacts(10));
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(messageInterval);
  }, []);

  useEffect(() => {
    const factInterval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setFactIndex((prevIndex) => (prevIndex + 1) % facts.length);
        setFadeIn(true);
      }, 300);
    }, 4000);
    return () => clearInterval(factInterval);
  }, [facts.length]);

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
      {/* Animated treasure chest */}
      <div className="relative">
        <div className="w-20 h-20 border-4 border-dashed rounded-full animate-spin border-teal-500"></div>
        <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
          💎
        </div>
      </div>

      <h3 className="mt-6 text-xl font-semibold text-slate-900">Appraising Your Treasure</h3>
      <p className="mt-2 text-slate-500 transition-opacity duration-500">
        {loadingMessages[messageIndex]}
      </p>

      {/* Fun fact section */}
      <div className="mt-8 max-w-md">
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
          <p className="text-xs font-semibold text-amber-600 mb-2 flex items-center justify-center gap-1">
            <span>💡</span> Did you know?
          </p>
          <p className={`text-sm text-amber-800 transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
            {facts[factIndex]}
          </p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="mt-6 flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i <= messageIndex % 5
                ? 'bg-teal-500 scale-100'
                : 'bg-slate-200 scale-75'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
