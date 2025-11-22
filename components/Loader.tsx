
'use client';

import React, { useState, useEffect } from 'react';
import { getRandomFacts } from '@/lib/funFacts';
import { GemIcon, LightbulbIcon } from './icons';

const loadingMessages = [
  "Analyzing item details",
  "Consulting market data",
  "Researching comparable sales",
  "Checking auction records",
  "Calculating estimated value",
  "Finalizing appraisal",
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
    <div className="flex flex-col items-center justify-center p-12 text-center">
      {/* Animated loader */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-2 border-slate-200 rounded-full"></div>
        <div className="absolute inset-0 border-2 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <GemIcon className="w-6 h-6 text-teal-500" />
        </div>
      </div>

      <h3 className="mt-8 text-lg font-semibold text-slate-900">
        Appraising Your Item
      </h3>
      <p className="mt-2 text-sm text-slate-500 transition-opacity duration-500">
        {loadingMessages[messageIndex]}...
      </p>

      {/* Fun fact section */}
      <div className="mt-8 max-w-sm">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
            <LightbulbIcon className="w-3.5 h-3.5" />
            <span>Did you know?</span>
          </div>
          <p className={`text-sm text-slate-700 transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
            {facts[factIndex]}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-6 flex gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i <= messageIndex ? 'bg-teal-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
