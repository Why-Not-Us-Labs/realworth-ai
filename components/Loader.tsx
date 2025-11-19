
'use client';

import React, { useState, useEffect } from 'react';

const loadingMessages = [
  "Analyzing item details...",
  "Consulting with digital archivists...",
  "Comparing with market data...",
  "Generating final image...",
  "Calculating estimated value...",
  "Finalizing appraisal...",
];

export const Loader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-500"></div>
      <h3 className="mt-6 text-xl font-semibold text-slate-900">Appraising Your Item</h3>
      <p className="mt-2 text-slate-500 transition-opacity duration-500">
        {loadingMessages[messageIndex]}
      </p>
    </div>
  );
};
