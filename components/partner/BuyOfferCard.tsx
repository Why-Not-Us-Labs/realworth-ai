'use client';

import React, { useState } from 'react';
import type { BuyOffer, SneakerDetails } from '@/lib/types';
import AuthenticityBadge from './AuthenticityBadge';
import FlawList from './FlawList';

type Props = {
  offer: BuyOffer;
  sneakerDetails: SneakerDetails;
  itemName: string;
  images: string[];
  appraisalId?: string | null;
  onAccept: () => void;
  onDecline: () => void;
};

const DECLINE_REASONS = [
  'Offer too low',
  'Changed my mind',
  'Wrong item identified',
  'Want to sell elsewhere',
  'Just browsing',
  'Other',
] as const;

async function persistOfferStatus(appraisalId: string, status: 'accepted' | 'declined', declineReason?: string) {
  try {
    await fetch('/api/partner/offer-response', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appraisalId, status, declineReason }),
    });
  } catch {
    // Non-blocking — still transition state even if API fails
    console.error('[BuyOfferCard] Failed to persist offer status');
  }
}

function formatMoney(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function BuyOfferCard({ offer, sneakerDetails, itemName, images, appraisalId, onAccept, onDecline }: Props) {
  const { breakdown } = offer;
  const [linkCopied, setLinkCopied] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsResponding(true);
    if (appraisalId) await persistOfferStatus(appraisalId, 'accepted');
    onAccept();
  };

  const handleDeclineClick = () => {
    setShowDeclineModal(true);
  };

  const handleConfirmDecline = async () => {
    setShowDeclineModal(false);
    setIsResponding(true);
    if (appraisalId) await persistOfferStatus(appraisalId, 'declined', selectedReason || undefined);
    onDecline();
  };

  const handleShare = async () => {
    if (!appraisalId) return;
    const shareUrl = `https://realworth.ai/treasure/${appraisalId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: itemName, text: 'Check out my sneaker appraisal!', url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Images */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${itemName} photo ${i + 1}`}
              className="h-32 w-32 rounded-lg object-cover shrink-0 border border-slate-700"
            />
          ))}
        </div>
      )}

      {/* Item info */}
      <div>
        <h2 className="text-xl font-bold text-white">{itemName}</h2>
        <p className="text-sm text-slate-400 mt-1">
          {sneakerDetails.brand} {sneakerDetails.model} &middot; {sneakerDetails.colorway}
        </p>
        {sneakerDetails.styleCode && sneakerDetails.styleCode !== 'unknown' && (
          <p className="text-xs text-slate-500 mt-0.5">Style: {sneakerDetails.styleCode}</p>
        )}
        <div className="flex gap-3 mt-2 text-xs text-slate-400">
          {sneakerDetails.size && sneakerDetails.size !== 'unknown' && (
            <span>Size {sneakerDetails.size}</span>
          )}
          <span>Grade: {sneakerDetails.conditionGrade}</span>
          <span>{sneakerDetails.hasOriginalBox ? 'With box' : 'No box'}</span>
        </div>
      </div>

      {/* Offer amount — hero */}
      <div className="text-center py-6 rounded-xl bg-gradient-to-br from-red-600 to-red-800 border border-red-500/30">
        <div className="text-sm text-red-200 font-medium mb-1">Our Offer</div>
        <div className="text-4xl font-extrabold text-white tracking-tight">
          {formatMoney(offer.amount)}
        </div>
        {offer.requiresManagerReview && (
          <div className="text-xs text-yellow-300 mt-2">Pending manager review</div>
        )}
      </div>

      {/* Breakdown */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2 text-sm">
        <h3 className="font-semibold text-white text-base mb-3">Offer Breakdown</h3>
        <Row label="Market value" value={formatMoney(breakdown.marketValue)} />
        <Row label="Base offer (after margin)" value={formatMoney(breakdown.baseOffer)} />
        {breakdown.conditionAdjustment !== 0 && (
          <Row label="Condition adjustment" value={formatMoney(breakdown.conditionAdjustment)} negative />
        )}
        {breakdown.flawDeductions !== 0 && (
          <Row label="Flaw deductions" value={formatMoney(breakdown.flawDeductions)} negative />
        )}
        {breakdown.accessoryDeductions !== 0 && (
          <Row label="No box deduction" value={formatMoney(breakdown.accessoryDeductions)} negative />
        )}
        <div className="border-t border-slate-600 pt-2 mt-2 flex justify-between font-bold text-white">
          <span>Final Offer</span>
          <span>{formatMoney(breakdown.finalOffer)}</span>
        </div>
      </div>

      {/* Authenticity */}
      <AuthenticityBadge score={sneakerDetails.authenticityScore} notes={sneakerDetails.authenticityNotes} />

      {/* Flaws */}
      {sneakerDetails.flaws.length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="font-semibold text-white text-base mb-3">Flaws Detected</h3>
          <FlawList flaws={sneakerDetails.flaws} />
        </div>
      )}

      {/* CTA */}
      <div className="space-y-3 pt-2">
        <button
          onClick={handleAccept}
          disabled={isResponding}
          className="w-full py-3 rounded-xl font-bold text-lg bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white transition-colors"
        >
          {isResponding ? 'Processing...' : 'Accept Offer'}
        </button>
        <button
          onClick={handleDeclineClick}
          disabled={isResponding}
          className="w-full py-3 rounded-xl font-medium text-sm border border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white disabled:opacity-50 transition-colors"
        >
          Decline
        </button>
        {appraisalId && (
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {linkCopied ? 'Link Copied!' : 'Share Appraisal'}
          </button>
        )}
      </div>

      {/* Store locations */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
        <h3 className="font-semibold text-white text-sm mb-2">Bring to a Bullseye location</h3>
        <div className="text-xs text-slate-400 space-y-1">
          <p>Philadelphia, PA &middot; Delaware &middot; Pennsylvania</p>
          <p className="text-slate-500">Offer valid for 48 hours</p>
        </div>
      </div>

      {/* Decline reason modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowDeclineModal(false)}>
          <div
            className="w-full max-w-lg bg-slate-800 rounded-t-2xl p-6 pb-8 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Why are you declining?</h3>
            <p className="text-sm text-slate-400 mb-4">Optional — helps us improve our offers</p>
            <div className="space-y-2 mb-6">
              {DECLINE_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(selectedReason === reason ? null : reason)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                    selectedReason === reason
                      ? 'bg-red-600/20 border border-red-500 text-white'
                      : 'bg-slate-700/50 border border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={handleConfirmDecline}
              className="w-full py-3 rounded-xl font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              Confirm Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={negative ? 'text-red-400' : 'text-slate-300'}>{value}</span>
    </div>
  );
}
