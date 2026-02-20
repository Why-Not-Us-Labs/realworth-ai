'use client';

import { useState } from 'react';

export type PipelineAppraisal = {
  id: string;
  itemName: string;
  thumbnailUrl: string | null;
  offerAmount: number;
  buyOfferStatus: string;
  sneakerBrand: string | null;
  sneakerModel: string | null;
  sneakerSize: string | null;
  conditionGrade: string | null;
  sourceStore: string | null;
  requiresManagerReview: boolean;
  createdAt: string;
  completedAt: string | null;
};

type Props = {
  appraisal: PipelineAppraisal;
  onUpdateStatus: (id: string, status: 'accepted' | 'declined' | 'pending') => Promise<void>;
  onAdjustOffer: (id: string, amount: number) => Promise<void>;
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  review: 'bg-purple-100 text-purple-700',
};

export function AppraisalRow({ appraisal, onUpdateStatus, onAdjustOffer }: Props) {
  const [adjusting, setAdjusting] = useState(false);
  const [adjustValue, setAdjustValue] = useState(appraisal.offerAmount.toFixed(2));
  const [loading, setLoading] = useState(false);

  const showActions = appraisal.buyOfferStatus === 'pending' || appraisal.buyOfferStatus === 'review';

  const handleAction = async (status: 'accepted' | 'declined') => {
    setLoading(true);
    try {
      await onUpdateStatus(appraisal.id, status);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async () => {
    const amount = parseFloat(adjustValue);
    if (isNaN(amount) || amount <= 0) return;
    setLoading(true);
    try {
      await onAdjustOffer(appraisal.id, amount);
      setAdjusting(false);
    } finally {
      setLoading(false);
    }
  };

  const brandModel = [appraisal.sneakerBrand, appraisal.sneakerModel].filter(Boolean).join(' ');
  const timeAgo = getTimeAgo(appraisal.createdAt);

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
        {appraisal.thumbnailUrl ? (
          <img src={appraisal.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">N/A</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{appraisal.itemName}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {brandModel && <span className="truncate">{brandModel}</span>}
          {appraisal.sneakerSize && <span>Size {appraisal.sneakerSize}</span>}
          {appraisal.sourceStore && (
            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{appraisal.sourceStore}</span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo}</p>
      </div>

      {/* Offer amount */}
      <div className="text-right flex-shrink-0">
        {adjusting ? (
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-500">$</span>
            <input
              type="number"
              value={adjustValue}
              onChange={(e) => setAdjustValue(e.target.value)}
              className="w-20 text-sm border border-slate-300 rounded px-2 py-1 text-right"
              step="0.01"
              min="0"
            />
            <button
              onClick={handleAdjust}
              disabled={loading}
              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setAdjusting(false)}
              className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-sm font-bold text-slate-900">${appraisal.offerAmount.toFixed(2)}</p>
        )}
      </div>

      {/* Status badge */}
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[appraisal.buyOfferStatus] || statusColors.pending}`}>
        {appraisal.buyOfferStatus === 'review' ? 'Needs Review' : appraisal.buyOfferStatus}
      </span>

      {/* Actions */}
      {showActions && !adjusting && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleAction('accepted')}
            disabled={loading}
            className="text-xs px-2.5 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            onClick={() => handleAction('declined')}
            disabled={loading}
            className="text-xs px-2.5 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50"
          >
            Decline
          </button>
          {appraisal.buyOfferStatus === 'review' && (
            <button
              onClick={() => setAdjusting(true)}
              disabled={loading}
              className="text-xs px-2.5 py-1 border border-slate-300 text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Adjust
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
