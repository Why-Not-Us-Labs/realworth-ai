'use client';

import React, { useState, useEffect } from 'react';
import type { SneakerDetails, BuyOffer } from '@/lib/types';
import type { EbayMarketData } from '@/services/ebayPriceService';
import BuyOfferCard from '@/components/partner/BuyOfferCard';
import GuidedCapture from '@/components/partner/GuidedCapture';
import { uploadFile, compressImage } from '@/lib/imageUtils';

type AppState = 'landing' | 'capture' | 'loading' | 'result' | 'accepted' | 'declined';

const LOADING_STEPS = [
  { label: 'Uploading photos...', delay: 0 },
  { label: 'Identifying sneaker model...', delay: 4000 },
  { label: 'Checking authenticity markers...', delay: 12000 },
  { label: 'Looking up market prices...', delay: 22000 },
  { label: 'Calculating your offer...', delay: 35000 },
];

// Persist uploaded image URLs to sessionStorage so they survive page reloads
function saveUrls(urls: string[]) {
  try { sessionStorage.setItem('bse_photos', JSON.stringify(urls)); } catch {}
}
function loadUrls(): string[] {
  try {
    const raw = sessionStorage.getItem('bse_photos');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function clearUrls() {
  try { sessionStorage.removeItem('bse_photos'); } catch {}
}

export default function BullseyePage() {
  const [state, setState] = useState<AppState>('landing');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  const [storeLocation, setStoreLocation] = useState<string | null>(null);

  // Result state
  const [itemName, setItemName] = useState('');
  const [appraisalId, setAppraisalId] = useState<string | null>(null);
  const [sneakerDetails, setSneakerDetails] = useState<SneakerDetails | null>(null);
  const [buyOffer, setBuyOffer] = useState<BuyOffer | null>(null);
  const [ebayMarketData, setEbayMarketData] = useState<EbayMarketData | null>(null);

  // Read ?store= param and restore session state on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const store = params.get('store');
    if (store) {
      setStoreLocation(store);
      try { sessionStorage.setItem('bse_store', store); } catch {}
    } else {
      try {
        const saved = sessionStorage.getItem('bse_store');
        if (saved) setStoreLocation(saved);
      } catch {}
    }

    const savedUrls = loadUrls();
    if (savedUrls.length > 0) {
      setUploadedUrls(savedUrls);
    }
  }, []);

  // Loading step timer
  useEffect(() => {
    if (state !== 'loading') {
      setLoadingStep(0);
      setLoadingElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setLoadingElapsed(elapsed);
      const step = LOADING_STEPS.reduce(
        (acc, s, i) => (elapsed >= s.delay ? i : acc),
        0
      );
      setLoadingStep(step);
    }, 500);
    return () => clearInterval(interval);
  }, [state]);

  const handleCaptureComplete = (capturedFiles: File[]) => {
    setFiles(capturedFiles);
    submitFiles(capturedFiles);
  };

  const submitFiles = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) {
      setError('Please add at least one photo');
      setState('landing');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setState('loading');

    try {
      // Upload files to storage at submit time (same pattern as main RealWorth app)
      const uploaded: string[] = [];
      for (const file of filesToUpload) {
        const compressed = await compressImage(file);
        const url = await uploadFile(compressed);
        if (url) uploaded.push(url);
      }
      if (uploaded.length === 0) {
        throw new Error('Failed to upload images. Please try again.');
      }
      const urls = uploaded;
      setUploadedUrls(urls);
      saveUrls(urls);

      const res = await fetch('/api/appraise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: urls,
          imagePaths: [],
          partnerId: 'bullseye',
          ...(storeLocation && { storeLocation }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Appraisal failed (${res.status})`);
      }

      const data = await res.json();
      setItemName(data.appraisalData?.itemName || 'Unknown Item');
      setAppraisalId(data.appraisalId || null);
      setSneakerDetails(data.sneakerDetails || null);
      setBuyOffer(data.buyOffer || null);
      setEbayMarketData(data.ebayMarketData || null);
      clearUrls();
      setState('result');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      if (msg.toLowerCase().includes('sneaker') || msg.toLowerCase().includes('not detected')) {
        setError('We couldn\'t identify sneakers in your photos. Try taking clearer photos showing the full shoe from multiple angles.');
      } else {
        setError(msg);
      }
      setState('landing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setState('landing');
    setFiles([]);
    setUploadedUrls([]);
    setError(null);
    clearUrls();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Landing */}
      {state === 'landing' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3">
              <img src="/partners/bullseye-logo.png" alt="Bullseye" className="h-10" />
              <span className="text-slate-300 text-lg font-normal">x</span>
              <img src="/partners/realworth-collab-logo.png" alt="RealWorth" className="h-10" />
            </div>
            {storeLocation ? (
              <p className="text-slate-500 text-sm mt-2">Welcome to Bullseye {storeLocation.charAt(0).toUpperCase() + storeLocation.slice(1)}</p>
            ) : (
              <p className="text-slate-500 text-sm mt-2">AI-Powered Sneaker Offers</p>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Get an instant cash offer for your sneakers
          </h2>
          <p className="text-slate-500 text-sm max-w-sm mb-8">
            Snap a few photos, get an AI-powered valuation and buy offer in seconds. Bring them to any Bullseye location to get paid.
          </p>
          <button
            onClick={() => setState('capture')}
            className="px-10 py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-xl transition-colors shadow-lg shadow-red-500/20"
          >
            Get Your Offer
          </button>
          <p className="text-xs text-slate-400 mt-6">No sign-up required</p>
          <a
            href="/partner/bullseye/batch"
            className="inline-block mt-4 text-xs text-slate-400 hover:text-red-500 underline transition-colors"
          >
            Staff? Upload multiple sneakers at once
          </a>
        </div>
      )}

      {/* Guided Capture */}
      {state === 'capture' && (
        <GuidedCapture
          onComplete={handleCaptureComplete}
          onCancel={() => setState('landing')}
        />
      )}

      {/* Error banner — shown on landing after a failed submission */}
      {state === 'landing' && error && (
        <div className="fixed bottom-6 left-4 right-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-600 text-center z-40">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-slate-500 underline mt-1">Dismiss</button>
        </div>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Analyzing your sneakers...</h2>
          <div className="space-y-2 mt-4 w-full max-w-xs">
            {LOADING_STEPS.map((step, i) => (
              <div
                key={step.label}
                className={`flex items-center gap-2 text-sm transition-all duration-500 ${
                  i < loadingStep ? 'text-green-600' : i === loadingStep ? 'text-slate-900 font-medium' : 'text-slate-300'
                }`}
              >
                {i < loadingStep ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : i === loadingStep ? (
                  <div className="w-4 h-4 flex-shrink-0 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-4 h-4 flex-shrink-0 rounded-full border-2 border-slate-200" />
                )}
                <span>{step.label}</span>
              </div>
            ))}
          </div>
          {loadingElapsed > 120000 && (
            <p className="text-xs text-amber-600 mt-6">Taking longer than expected... hang tight!</p>
          )}
        </div>
      )}

      {/* Result with buy offer */}
      {state === 'result' && sneakerDetails && buyOffer && (
        <div className="min-h-screen px-4 py-8 bg-slate-900">
          <BuyOfferCard
            offer={buyOffer}
            sneakerDetails={sneakerDetails}
            itemName={itemName}
            images={uploadedUrls}
            appraisalId={appraisalId}
            ebayMarketData={ebayMarketData}
            onAccept={() => setState('accepted')}
            onDecline={() => setState('declined')}
          />
        </div>
      )}

      {/* Result without buy offer */}
      {state === 'result' && !buyOffer && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Appraisal Complete</h2>
          <p className="text-slate-500 text-sm mb-6">
            {itemName ? `We identified: ${itemName}` : 'Item identified.'}{' '}
            We couldn&apos;t generate a buy offer for this item. This service is currently for sneakers only.
          </p>
          <button onClick={reset} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
            Try Again
          </button>
        </div>
      )}

      {/* Accepted */}
      {state === 'accepted' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="text-5xl mb-4 text-green-500">&#10003;</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Offer Accepted</h2>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            Bring your sneakers to any Bullseye location within 48 hours. Show this screen to complete the sale.
          </p>
          {buyOffer && (
            <div className="text-3xl font-extrabold text-red-600 mb-6">
              ${buyOffer.amount.toFixed(2)}
            </div>
          )}
          <button onClick={reset} className="px-6 py-3 border border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl transition-colors">
            Start New Offer
          </button>
        </div>
      )}

      {/* Declined */}
      {state === 'declined' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-3">No problem</h2>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            Thanks for checking. You can always submit again or visit a Bullseye location for an in-person offer.
          </p>
          <button onClick={reset} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}

