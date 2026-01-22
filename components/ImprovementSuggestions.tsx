'use client';

import { AppraisalImprovements } from '@/lib/types';
import { CameraIcon, SparklesIcon } from '@/components/icons';

type Props = {
  improvements: AppraisalImprovements;
  onAddPhotos?: () => void;
  currency?: string;
};

export function ImprovementSuggestions({ improvements, onAddPhotos, currency = 'USD' }: Props) {
  const formatPrice = (value: number) => {
    if (currency === 'USD') {
      return value >= 1000
        ? `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
        : `$${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${currency}`;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'medium':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'low':
        return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'High Impact';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return impact;
    }
  };

  if (!improvements.canImprove || improvements.suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-amber-900/20 to-slate-900/50 rounded-xl p-4 border border-amber-700/30">
      {/* Header with potential value increase */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/20 rounded-lg">
            <SparklesIcon className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Improve This Appraisal</h3>
        </div>
        {improvements.potentialValueIncrease && (
          <span className="text-xs font-semibold text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">
            +{formatPrice(improvements.potentialValueIncrease.low)} - {formatPrice(improvements.potentialValueIncrease.high)}
          </span>
        )}
      </div>

      {/* Suggestions list */}
      <div className="space-y-2 mb-4">
        {improvements.suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-3"
          >
            {/* Icon */}
            <div className={`p-1.5 rounded-lg ${getImpactColor(suggestion.impact)}`}>
              <CameraIcon className="w-3.5 h-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-white">
                  {suggestion.description}
                </span>
                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${getImpactColor(suggestion.impact)}`}>
                  {getImpactLabel(suggestion.impact)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {suggestion.reason}
              </p>
              {suggestion.areaOfInterest && (
                <p className="text-xs text-amber-400/70 mt-1">
                  Focus area: {suggestion.areaOfInterest}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Photos CTA */}
      {onAddPhotos && (
        <button
          onClick={onAddPhotos}
          className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <CameraIcon className="w-4 h-4" />
          Add Photos to Improve Appraisal
        </button>
      )}
    </div>
  );
}
