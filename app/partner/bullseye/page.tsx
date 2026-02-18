'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { SneakerConditionGrade, SneakerDetails, BuyOffer } from '@/lib/types';
import SneakerConditionPicker from '@/components/partner/SneakerConditionPicker';
import BuyOfferCard from '@/components/partner/BuyOfferCard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AppState = 'landing' | 'form' | 'loading' | 'result' | 'accepted' | 'declined';

// --- Helpers ---

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
  // Refs — same pattern as main RealWorth FileUpload
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<AppState>('landing');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [condition, setCondition] = useState<SneakerConditionGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result state
  const [itemName, setItemName] = useState('');
  const [sneakerDetails, setSneakerDetails] = useState<SneakerDetails | null>(null);
  const [buyOffer, setBuyOffer] = useState<BuyOffer | null>(null);

  // Restore uploaded URLs from sessionStorage on mount (survives camera reload)
  useEffect(() => {
    const saved = loadUrls();
    if (saved.length > 0) {
      setUploadedUrls(saved);
      setState('form');
    }
  }, []);

  // When files are added, store them for preview (upload happens at submit time, like main app)
  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setState(prev => prev === 'landing' ? 'form' : prev);
    const newFiles = Array.from(fileList);
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
  }, []);

  const removePhoto = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedUrls(prev => {
      const updated = prev.filter((_, i) => i !== index);
      saveUrls(updated);
      return updated;
    });
  };

  // Same onChange pattern as main app FileUpload
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (e.target) e.target.value = '';
  };

  const submit = async () => {
    // Need either File objects or previously uploaded URLs (from sessionStorage restore)
    if (files.length === 0 && uploadedUrls.length === 0) {
      setError('Please add at least one photo');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setState('loading');

    try {
      // Upload files to storage at submit time (same pattern as main RealWorth app)
      let urls = uploadedUrls;

      if (files.length > 0) {
        const uploaded: string[] = [];
        for (const file of files) {
          const compressed = await compressImage(file);
          const url = await uploadFile(compressed);
          if (url) uploaded.push(url);
        }
        if (uploaded.length === 0) {
          throw new Error('Failed to upload images. Please try again.');
        }
        urls = uploaded;
      }

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
      clearUrls();
      setState('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setState('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setState('landing');
    setFiles([]);
    setUploadedUrls([]);
    setCondition(null);
    setError(null);
    clearUrls();
  };

  const maxFiles = 5;
  const photoCount = Math.max(files.length, uploadedUrls.length);

  // --- Single return — inputs are ALWAYS in the DOM ---
  return (
    <div className="min-h-screen">
      {/* Hidden file inputs — always mounted, same pattern as main RealWorth FileUpload */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        className="hidden"
        aria-label="Take photo"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        onChange={onFileChange}
        className="hidden"
        aria-label="Upload photos"
      />

      {/* Landing */}
      {state === 'landing' && (
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
      )}

      {/* Form */}
      {state === 'form' && (
        <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">
              <span className="text-red-500">Bullseye</span>{' '}
              <span className="text-slate-500 text-sm">x</span>{' '}
              <span className="text-white">RealWorth</span>
            </h1>
          </div>

          <h2 className="text-lg font-bold text-white mb-4">Take sneaker photos</h2>
          <p className="text-xs text-slate-400 mb-4">Up to 5 photos &middot; Multiple angles help accuracy</p>

          {/* Mobile: Camera button — same pattern as main RealWorth FileUpload */}
          {photoCount < maxFiles && (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="sm:hidden flex flex-col justify-center items-center w-full px-4 py-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors touch-manipulation min-h-[140px] border-red-500 bg-red-500/5 active:bg-red-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="mt-3 text-sm font-semibold text-red-400">
                Take Photos
              </p>
              <p className="mt-1 text-xs text-slate-500">Tap to open camera</p>
            </button>
          )}

          {/* Desktop: Upload area */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoCount >= maxFiles}
            className="hidden sm:flex flex-col justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-xl cursor-pointer min-h-[140px] border-red-500 bg-red-500/5 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="mt-3 text-sm font-semibold text-red-400">Upload Photos</p>
            <p className="mt-1 text-xs text-slate-500">Click to browse</p>
          </button>

          {/* Image previews — show from File objects (instant) with URL fallback (persisted) */}
          {photoCount > 0 && (
            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-2">{photoCount} of {maxFiles} photos</div>
              <div className="grid grid-cols-3 gap-2">
                {(files.length > 0 ? files : []).map((file, i) => (
                  <FilePreview key={`${file.name}-${file.lastModified}-${i}`} file={file} index={i} onRemove={() => removePhoto(i)} />
                ))}
                {/* Show URL-based previews for restored photos (after page reload) */}
                {files.length === 0 && uploadedUrls.map((url, i) => (
                  <div key={url} className="relative group aspect-square">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-slate-700" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <SneakerConditionPicker value={condition} onChange={setCondition} />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={photoCount === 0 || isSubmitting}
            className="mt-6 w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-colors"
          >
            {isSubmitting ? 'Analyzing...' : 'Get My Offer'}
          </button>
        </div>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-xl font-bold text-white mb-2">Analyzing your sneakers...</h2>
          <p className="text-sm text-slate-400">Uploading photos and checking condition, authenticity, and market value</p>
        </div>
      )}

      {/* Result with buy offer */}
      {state === 'result' && sneakerDetails && buyOffer && (
        <div className="min-h-screen px-4 py-8">
          <BuyOfferCard
            offer={buyOffer}
            sneakerDetails={sneakerDetails}
            itemName={itemName}
            images={uploadedUrls}
            onAccept={() => setState('accepted')}
            onDecline={() => setState('declined')}
          />
        </div>
      )}

      {/* Result without buy offer */}
      {state === 'result' && !buyOffer && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Appraisal Complete</h2>
          <p className="text-slate-400 text-sm mb-6">
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
          <button onClick={reset} className="px-6 py-3 border border-slate-600 text-slate-400 hover:text-white rounded-xl transition-colors">
            Start New Offer
          </button>
        </div>
      )}

      {/* Declined */}
      {state === 'declined' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <h2 className="text-xl font-bold text-white mb-3">No problem</h2>
          <p className="text-slate-400 text-sm max-w-sm mb-6">
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

// File preview component — same pattern as main RealWorth ImagePreview
function FilePreview({ file, index, onRemove }: { file: File; index: number; onRemove: () => void }) {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="relative group aspect-square">
      <img
        src={imageUrl}
        alt={`Photo ${index + 1}`}
        className="w-full h-full object-cover rounded-lg border border-slate-700"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
      >
        &times;
      </button>
    </div>
  );
}
