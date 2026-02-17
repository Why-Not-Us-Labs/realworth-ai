'use client';

import React, { useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { SneakerConditionGrade, SneakerDetails, BuyOffer } from '@/lib/types';
import SneakerConditionPicker from '@/components/partner/SneakerConditionPicker';
import BuyOfferCard from '@/components/partner/BuyOfferCard';

// Supabase client for anonymous uploads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AppState = 'landing' | 'form' | 'loading' | 'result' | 'accepted' | 'declined';

async function uploadFile(file: File): Promise<string | null> {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(7);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `partner/bullseye/${ts}-${rand}.${ext}`;

  const { error } = await supabase.storage
    .from('appraisal-images')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('appraisal-images')
    .getPublicUrl(path);

  return publicUrl;
}

async function compressImage(file: File): Promise<File> {
  if (file.size <= 1.5 * 1024 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => resolve(file), 3000);

    img.onload = () => {
      clearTimeout(timeout);
      let { width, height } = img;
      const max = 1600;
      if (width > max || height > max) {
        if (width > height) { height = (height / width) * max; width = max; }
        else { width = (width / height) * max; height = max; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else resolve(file);
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => { clearTimeout(timeout); resolve(file); };
    img.src = URL.createObjectURL(file);
  });
}

export default function BullseyePage() {
  const [state, setState] = useState<AppState>('landing');
  const [files, setFiles] = useState<File[]>([]);
  const [condition, setCondition] = useState<SneakerConditionGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result state
  const [itemName, setItemName] = useState('');
  const [sneakerDetails, setSneakerDetails] = useState<SneakerDetails | null>(null);
  const [buyOffer, setBuyOffer] = useState<BuyOffer | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles(prev => [...prev, ...Array.from(newFiles)].slice(0, 5));
  }, []);

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const submit = async () => {
    if (files.length === 0) { setError('Please add at least one photo'); return; }
    setError(null);
    setIsSubmitting(true);
    setState('loading');

    try {
      // Upload images
      const compressed = await Promise.all(files.map(f => compressImage(f)));
      const uploadResults = await Promise.all(compressed.map(f => uploadFile(f)));
      const urls = uploadResults.filter((u): u is string => u !== null);

      if (urls.length === 0) throw new Error('Failed to upload images');

      setImageUrls(urls);

      // Call appraise API with partner mode
      const res = await fetch('/api/appraise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: urls,
          imagePaths: [],
          condition: condition || undefined,
          partnerId: 'bullseye',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Appraisal failed (${res.status})`);
      }

      const data = await res.json();
      setItemName(data.appraisalData?.itemName || 'Unknown Item');
      setSneakerDetails(data.sneakerDetails || null);
      setBuyOffer(data.buyOffer || null);
      setState('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setState('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Renders ----

  if (state === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-red-500">Bullseye</span>{' '}
            <span className="text-slate-400 text-lg font-normal">x</span>{' '}
            <span className="text-white">RealWorth</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">AI-Powered Sneaker Offers</p>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">
          Get an instant cash offer for your sneakers
        </h2>
        <p className="text-slate-400 text-sm max-w-sm mb-8">
          Snap a few photos, get an AI-powered valuation and buy offer in seconds. Bring them to any Bullseye location to get paid.
        </p>
        <button
          onClick={() => setState('form')}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-lg transition-colors"
        >
          Get Your Offer
        </button>
        <p className="text-xs text-slate-600 mt-6">No sign-up required</p>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-bold text-white mb-2">Analyzing your sneakers...</h2>
        <p className="text-sm text-slate-400">Our AI is checking condition, authenticity, and market value</p>
      </div>
    );
  }

  if (state === 'result' && sneakerDetails && buyOffer) {
    return (
      <div className="min-h-screen px-4 py-8">
        <BuyOfferCard
          offer={buyOffer}
          sneakerDetails={sneakerDetails}
          itemName={itemName}
          images={imageUrls}
          onAccept={() => setState('accepted')}
          onDecline={() => setState('declined')}
        />
      </div>
    );
  }

  if (state === 'result' && !buyOffer) {
    // Appraisal completed but no buy offer (maybe not sneakers, or error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-bold text-white mb-3">Appraisal Complete</h2>
        <p className="text-slate-400 text-sm mb-6">
          {itemName ? `We identified: ${itemName}` : 'Item identified.'}{' '}
          We couldn&apos;t generate a buy offer for this item. This service is currently for sneakers only.
        </p>
        <button
          onClick={() => { setState('form'); setFiles([]); setCondition(null); }}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (state === 'accepted') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">&#10003;</div>
        <h2 className="text-2xl font-bold text-white mb-3">Offer Accepted</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-6">
          Bring your sneakers to any Bullseye location within 48 hours. Show this screen to complete the sale.
        </p>
        {buyOffer && (
          <div className="text-3xl font-extrabold text-red-500 mb-6">
            ${buyOffer.amount.toFixed(2)}
          </div>
        )}
        <button
          onClick={() => { setState('landing'); setFiles([]); setCondition(null); }}
          className="px-6 py-3 border border-slate-600 text-slate-400 hover:text-white rounded-xl transition-colors"
        >
          Start New Offer
        </button>
      </div>
    );
  }

  if (state === 'declined') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-bold text-white mb-3">No problem</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-6">
          Thanks for checking. You can always submit again or visit a Bullseye location for an in-person offer.
        </p>
        <button
          onClick={() => { setState('landing'); setFiles([]); setCondition(null); }}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
        >
          Start Over
        </button>
      </div>
    );
  }

  // ---- Form state ----
  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">
          <span className="text-red-500">Bullseye</span>{' '}
          <span className="text-slate-500 text-sm">x</span>{' '}
          <span className="text-white">RealWorth</span>
        </h1>
      </div>

      <h2 className="text-lg font-bold text-white mb-4">Upload sneaker photos</h2>
      <p className="text-xs text-slate-400 mb-4">Up to 5 photos &middot; Multiple angles help accuracy</p>

      {/* Mobile: Camera label — uses htmlFor for reliable native camera handoff */}
      {files.length < 5 && (
        <label
          htmlFor="camera-input"
          className="sm:hidden flex flex-col justify-center items-center w-full px-4 py-10 border-2 border-dashed rounded-xl transition-colors min-h-[120px] border-red-500 bg-red-500/5 active:bg-red-500/20 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="mt-2 text-sm font-semibold text-red-400">Take Photos</p>
        </label>
      )}
      <input
        id="camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={e => { handleFiles(e.target.files); if (e.target) e.target.value = ''; }}
        className="hidden"
      />

      {/* Desktop: Upload area */}
      <label
        htmlFor="file-input"
        className="hidden sm:flex flex-col justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-xl cursor-pointer min-h-[120px] border-red-500 bg-red-500/5 hover:bg-red-500/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <p className="mt-2 text-sm font-semibold text-red-400">Upload Photos</p>
        <p className="text-xs text-slate-500">Click to browse</p>
      </label>
      <input
        id="file-input"
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        onChange={e => { handleFiles(e.target.files); if (e.target) e.target.value = ''; }}
        className="hidden"
      />

      {/* Image previews */}
      {files.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-slate-400 mb-2">{files.length} of 5 photos</div>
          <div className="grid grid-cols-3 gap-2">
            {files.map((file, i) => (
              <FilePreview key={`${file.name}-${i}`} file={file} onRemove={() => removeFile(i)} />
            ))}
          </div>
        </div>
      )}

      {/* Condition picker */}
      <div className="mt-6">
        <SneakerConditionPicker value={condition} onChange={setCondition} />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={files.length === 0 || isSubmitting}
        className="mt-6 w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-colors"
      >
        {isSubmitting ? 'Analyzing...' : 'Get My Offer'}
      </button>
    </div>
  );
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState('');
  React.useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <div className="relative group aspect-square">
      {url && <img src={url} alt={file.name} className="w-full h-full object-cover rounded-lg border border-slate-700" />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
      >
        &times;
      </button>
    </div>
  );
}
