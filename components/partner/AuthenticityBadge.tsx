'use client';

import React from 'react';

type Props = {
  score: number;
  notes: string;
};

export default function AuthenticityBadge({ score, notes }: Props) {
  let color: string;
  let label: string;

  if (score >= 85) {
    color = 'bg-green-500/20 text-green-400 border-green-500/40';
    label = 'High Confidence';
  } else if (score >= 60) {
    color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    label = 'Moderate';
  } else {
    color = 'bg-red-500/20 text-red-400 border-red-500/40';
    label = 'Low Confidence';
  }

  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">Authenticity</span>
        <span className="text-lg font-bold">{score}/100</span>
      </div>
      <div className="text-xs font-medium mb-1">{label}</div>
      {notes && <p className="text-xs opacity-80">{notes}</p>}
    </div>
  );
}
