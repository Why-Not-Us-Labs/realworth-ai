'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BULLSEYE_STORES } from '@/lib/partnerConfig';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LOADING_STEPS = [
  { label: 'Uploading photos...', delay: 0 },
  { label: 'Identifying sneaker model...', delay: 4000 },
  { label: 'Checking authenticity markers...', delay: 12000 },
  { label: 'Looking up market prices...', delay: 22000 },
  { label: 'Calculating offer...', delay: 35000 },
];

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

type Props = {
  onSuccess: () => void;
  onClose: () => void;
};

export default function SubmitAppraisalModal({ onSuccess, onClose }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [storeLocation, setStoreLocation] = useState(BULLSEYE_STORES[0].id);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, isSubmitting]);

  // Loading step timer
  useEffect(() => {
    if (!isSubmitting) { setLoadingStep(0); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const step = LOADING_STEPS.reduce(
        (acc, s, i) => (elapsed >= s.delay ? i : acc), 0
      );
      setLoadingStep(step);
    }, 500);
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFiles(prev => [...prev, ...Array.from(fileList)].slice(0, 5));
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (e.target) e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (files.length === 0) {
      setError('Please add at least one photo');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Upload files
      const urls: string[] = [];
      for (const file of files) {
        const compressed = await compressImage(file);
        const url = await uploadFile(compressed);
        if (url) urls.push(url);
      }
      if (urls.length === 0) {
        throw new Error('Failed to upload images. Please try again.');
      }

      const res = await fetch('/api/appraise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: urls,
          imagePaths: [],
          partnerId: 'bullseye',
          storeLocation,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Appraisal failed (${res.status})`);
      }

      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      if (msg.toLowerCase().includes('sneaker') || msg.toLowerCase().includes('not detected')) {
        setError('Couldn\'t identify sneakers in the photos. Try clearer photos showing the full shoe from multiple angles.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxFiles = 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        onChange={onFileChange}
        className="hidden"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">New Appraisal</h2>
          {!isSubmitting && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
          )}
        </div>

        {isSubmitting ? (
          /* Loading state */
          <div className="px-5 py-10 text-center">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-900 mb-4">Analyzing sneakers...</p>
            <div className="space-y-2 max-w-xs mx-auto text-left">
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
          </div>
        ) : (
          /* Form */
          <div className="px-5 py-4 space-y-4">
            {/* Store selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Store</label>
              <select
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
              >
                {BULLSEYE_STORES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Photos ({files.length}/{maxFiles})
              </label>

              {files.length < maxFiles && (
                <>
                  {/* Mobile: Camera */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="sm:hidden flex flex-col justify-center items-center w-full px-4 py-6 border-2 border-dashed border-red-500 bg-red-500/5 active:bg-red-500/20 rounded-xl"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <p className="mt-2 text-xs font-semibold text-red-500">Take Photos</p>
                  </button>

                  {/* Desktop: File picker */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="hidden sm:flex flex-col justify-center items-center w-full px-4 py-6 border-2 border-dashed border-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-xl"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <p className="mt-2 text-xs font-semibold text-red-500">Upload Photos</p>
                  </button>
                </>
              )}

              {/* Previews */}
              {files.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {files.map((file, i) => (
                    <FilePreview key={`${file.name}-${file.lastModified}-${i}`} file={file} index={i} onRemove={() => removePhoto(i)} />
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={submit}
              disabled={files.length === 0}
              className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors"
            >
              Submit Appraisal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilePreview({ file, index, onRemove }: { file: File; index: number; onRemove: () => void }) {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="relative aspect-square">
      <img
        src={imageUrl}
        alt={`Photo ${index + 1}`}
        className="w-full h-full object-cover rounded-lg border border-slate-200"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
      >
        &times;
      </button>
    </div>
  );
}
