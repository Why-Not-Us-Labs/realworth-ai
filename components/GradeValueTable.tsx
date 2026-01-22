'use client';

import { GradeValueTiers } from '@/lib/types';
import { ChartBarIcon } from '@/components/icons';

type Props = {
  tiers: GradeValueTiers;
  currency?: string;
};

export function GradeValueTable({ tiers, currency = 'USD' }: Props) {
  const formatPrice = (value: number) => {
    if (currency === 'USD') {
      return value >= 1000
        ? `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
        : `$${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${currency}`;
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-teal-500/20 rounded-lg">
          <ChartBarIcon className="w-4 h-4 text-teal-400" />
        </div>
        <h3 className="text-sm font-semibold text-white">Value by Condition Grade</h3>
        <span className="ml-auto text-xs text-slate-500">{tiers.gradingSystemUsed}</span>
      </div>

      {/* Grade Table */}
      <div className="space-y-1.5 mb-4">
        {tiers.grades.map((tier, index) => (
          <div
            key={tier.grade}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
              tier.isCurrentEstimate
                ? 'bg-teal-500/20 border border-teal-500/40 shadow-lg shadow-teal-500/10'
                : 'bg-slate-800/50 hover:bg-slate-800/70'
            }`}
          >
            {/* Grade indicator */}
            <div className={`flex items-center gap-2 min-w-[80px] ${
              tier.isCurrentEstimate ? 'text-teal-400' : 'text-slate-400'
            }`}>
              {tier.isCurrentEstimate && (
                <span className="text-teal-400 text-lg">&#9654;</span>
              )}
              <span className={`font-mono text-sm ${tier.isCurrentEstimate ? 'font-bold' : ''}`}>
                {tier.grade}
              </span>
            </div>

            {/* Value range */}
            <div className={`flex-1 text-right font-semibold ${
              tier.isCurrentEstimate ? 'text-teal-400' : 'text-white'
            }`}>
              {formatPrice(tier.valueRange.low)} - {formatPrice(tier.valueRange.high)}
            </div>

            {/* Your item badge */}
            {tier.isCurrentEstimate && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-500 text-white px-2 py-0.5 rounded-full">
                Your Item
              </span>
            )}

            {/* Description (if available) */}
            {tier.description && !tier.isCurrentEstimate && (
              <span className="text-xs text-slate-500 max-w-[100px] truncate hidden sm:inline">
                {tier.description}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Narrative */}
      <div className="bg-slate-800/30 rounded-lg p-3 border-l-2 border-teal-500/50">
        <p className="text-sm text-slate-300 leading-relaxed italic">
          &ldquo;{tiers.gradingNarrative}&rdquo;
        </p>
      </div>

      {/* Professional grading CTA */}
      <div className="mt-3 text-center">
        <p className="text-xs text-slate-500">
          Professional grading from PCGS/NGC/PMG can add significant value
        </p>
      </div>
    </div>
  );
}
