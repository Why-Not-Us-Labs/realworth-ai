'use client';

import React from 'react';
import type { SneakerFlaw } from '@/lib/types';

type Props = {
  flaws: SneakerFlaw[];
};

const severityStyles: Record<string, string> = {
  major: 'bg-red-500/20 text-red-400',
  moderate: 'bg-yellow-500/20 text-yellow-400',
  minor: 'bg-slate-500/20 text-slate-400',
};

export default function FlawList({ flaws }: Props) {
  if (!flaws.length) {
    return (
      <div className="text-sm text-green-400">No flaws detected</div>
    );
  }

  return (
    <ul className="space-y-2">
      {flaws.map((flaw, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium uppercase ${severityStyles[flaw.severity] || severityStyles.minor}`}>
            {flaw.severity}
          </span>
          <div className="min-w-0">
            <span className="text-slate-300">{flaw.location}:</span>{' '}
            <span className="text-slate-400">{flaw.description}</span>
            <span className="text-red-400 ml-1 text-xs">-{flaw.priceImpact}%</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
