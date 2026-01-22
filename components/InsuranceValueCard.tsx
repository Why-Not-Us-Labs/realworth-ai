'use client';

import { InsuranceValue } from '@/lib/types';
import { ShieldCheckIcon } from '@/components/icons';

type Props = {
  insurance: InsuranceValue;
  currency?: string;
};

export function InsuranceValueCard({ insurance, currency = 'USD' }: Props) {
  const formatPrice = (value: number) => {
    if (currency === 'USD') {
      return `$${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${currency}`;
  };

  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-slate-900/50 rounded-xl p-4 border border-blue-700/30">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-blue-500/20 rounded-lg">
          <ShieldCheckIcon className="w-4 h-4 text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-white">Insurance Recommendation</h3>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold text-blue-400">
          {formatPrice(insurance.recommended)}
        </span>
        <span className="text-sm text-slate-400">retail replacement value</span>
      </div>

      {/* Methodology */}
      <p className="text-sm text-slate-400 mb-3">
        {insurance.methodology}
      </p>

      {/* Disclaimer */}
      <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
        <p className="text-xs text-slate-500 italic">
          {insurance.disclaimer}
        </p>
      </div>
    </div>
  );
}
