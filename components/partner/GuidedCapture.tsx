'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

// --- Step definitions ---

type StepDef = {
  id: string;
  instruction: string;
  skippable?: boolean;
  skipLabel?: string;
};

const STEPS: StepDef[] = [
  { id: 'tag', instruction: 'Take a photo of the sneaker tag.', skippable: true, skipLabel: 'No Tag?' },
  { id: 'outer', instruction: 'Lay the sneakers flat and photograph the outer sides.' },
  { id: 'inner', instruction: 'Lay the sneakers flat and photograph the inner sides.' },
  { id: 'top', instruction: 'Take a photo of the top of the sneakers.' },
  { id: 'back', instruction: 'Take a photo of the back of the sneakers.' },
  { id: 'soles', instruction: 'Stack the sneakers sideways to take a photo of the soles.' },
  { id: 'issues', instruction: 'Add at least one additional photo of the sneaker\'s issue.' },
];

const MAX_EXTRAS = 3; // up to 3 extra photos after step 7 (10 total max)

type Props = {
  onComplete: (files: File[]) => void;
  onCancel: () => void;
};

export default function GuidedCapture({ onComplete, onCancel }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fallbackCameraRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<(File | null)[]>(new Array(STEPS.length).fill(null));
  const [extraPhotos, setExtraPhotos] = useState<File[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  const [extraPreviewUrls, setExtraPreviewUrls] = useState<string[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  const totalSlots = STEPS.length + MAX_EXTRAS;
  const isExtraStep = currentStep >= STEPS.length;
  const extraIndex = currentStep - STEPS.length;

  const capturedCount = photos.filter(Boolean).length + extraPhotos.length;
  const totalPhotos = STEPS.length + extraPhotos.length + (isExtraStep && extraIndex >= extraPhotos.length ? 1 : 0);
  const displayStep = currentStep + 1;
  const displayTotal = Math.max(totalPhotos, displayStep);

  const currentPhoto = isExtraStep
    ? extraPhotos[extraIndex] || null
    : photos[currentStep];

  const currentPreviewUrl = isExtraStep
    ? extraPreviewUrls[extraIndex] || null
    : previewUrls[currentStep] || null;

  const canFinish = capturedCount >= 2; // at least 2 photos to submit

  // --- Camera lifecycle ---
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1080 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (!cancelled) {
          setCameraError(err instanceof Error ? err.message : 'Camera not available');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const onVideoReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  // --- Capture frame from video ---
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);

    const stepId = isExtraStep ? `extra-${extraIndex}` : STEPS[currentStep].id;
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `photo-${stepId}.jpg`, { type: 'image/jpeg' });
      handlePhotoCapture(file);
    }, 'image/jpeg', 0.92);
  }, [currentStep, isExtraStep, extraIndex]);

  const handlePhotoCapture = useCallback((file: File) => {
    const url = URL.createObjectURL(file);

    if (isExtraStep) {
      setExtraPhotos(prev => {
        const updated = [...prev];
        updated[extraIndex] = file;
        return updated;
      });
      setExtraPreviewUrls(prev => {
        const updated = [...prev];
        if (updated[extraIndex]) URL.revokeObjectURL(updated[extraIndex]);
        updated[extraIndex] = url;
        return updated;
      });
    } else {
      setPhotos(prev => {
        const updated = [...prev];
        updated[currentStep] = file;
        return updated;
      });
      setPreviewUrls(prev => {
        if (prev[currentStep]) URL.revokeObjectURL(prev[currentStep]);
        return { ...prev, [currentStep]: url };
      });
    }

    // Auto-advance after brief delay
    setTimeout(() => {
      const nextStep = currentStep + 1;
      if (nextStep < totalSlots) {
        setCurrentStep(nextStep);
        scrollThumbnail(nextStep);
      }
    }, 600);
  }, [currentStep, isExtraStep, extraIndex, totalSlots]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoCapture(file);
    if (e.target) e.target.value = '';
  };

  const skipStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      scrollThumbnail(currentStep + 1);
    }
  };

  // Change 3: Unrestricted thumbnail navigation
  const goToStep = (step: number) => {
    if (step < totalSlots) {
      setCurrentStep(step);
      scrollThumbnail(step);
    }
  };

  const scrollThumbnail = (step: number) => {
    if (thumbnailRef.current) {
      const child = thumbnailRef.current.children[step] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const finish = () => {
    const allFiles = [
      ...photos.filter((f): f is File => f !== null),
      ...extraPhotos,
    ];
    // Revoke all preview URLs
    Object.values(previewUrls).forEach(u => URL.revokeObjectURL(u));
    extraPreviewUrls.forEach(u => URL.revokeObjectURL(u));
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onComplete(allFiles);
  };

  const currentInstruction = isExtraStep
    ? 'Add more photos or finish now.'
    : STEPS[currentStep].instruction;

  const currentSkippable = !isExtraStep && STEPS[currentStep].skippable;
  const currentSkipLabel = !isExtraStep ? STEPS[currentStep].skipLabel : undefined;

  const showLiveCamera = cameraReady && !currentPreviewUrl && !cameraError;
  const showCameraLoading = !cameraReady && !currentPreviewUrl && !cameraError;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Hidden inputs */}
      <input
        ref={fallbackCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={onFileChange}
        className="hidden"
      />
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Help overlay */}
      {showHelp && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Photo Guide</h3>
              <button onClick={() => setShowHelp(false)} className="text-slate-400 text-xl leading-none">&times;</button>
            </div>
            <div className="space-y-4">
              {STEPS.map((step, i) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <StepIcon stepId={step.id} size={28} color="#fff" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Photo {i + 1}</p>
                    <p className="text-xs text-slate-500">{step.instruction}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full py-2.5 bg-slate-900 text-white font-semibold rounded-xl text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Viewfinder area */}
      <div className="flex-1 flex flex-col items-center bg-white pt-2">
        <div className="relative w-full max-w-sm aspect-square mx-auto bg-slate-900 rounded-2xl overflow-hidden">
          {/* Live camera feed */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onLoadedMetadata={onVideoReady}
            className={`w-full h-full object-cover ${showLiveCamera ? 'block' : 'hidden'}`}
          />

          {/* Camera loading spinner */}
          {showCameraLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Camera error fallback */}
          {cameraError && !currentPreviewUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
              <p className="text-white/70 text-sm text-center">Camera not available</p>
              <button
                onClick={() => fallbackCameraRef.current?.click()}
                className="px-4 py-2 bg-white/20 text-white text-sm rounded-lg border border-white/30"
              >
                Open Camera
              </button>
            </div>
          )}

          {/* Photo preview */}
          {currentPreviewUrl && (
            <img
              src={currentPreviewUrl}
              alt={`Photo ${displayStep}`}
              className="w-full h-full object-cover"
            />
          )}

          {/* Silhouette overlay — always on top, pointer-events: none */}
          {!currentPreviewUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Silhouette stepId={isExtraStep ? 'extra' : STEPS[currentStep].id} />
            </div>
          )}

          {/* Shutter flash */}
          {showFlash && (
            <div className="absolute inset-0 bg-white/80 pointer-events-none" />
          )}

          {/* HELP button */}
          <button
            onClick={() => setShowHelp(true)}
            className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg border border-white/20"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1" stroke="white" strokeWidth="1.2"/><line x1="4" y1="5.5" x2="10" y2="5.5" stroke="white" strokeWidth="1"/><line x1="4" y1="8" x2="8" y2="8" stroke="white" strokeWidth="1"/></svg>
            <span className="text-white text-xs font-semibold tracking-wide">HELP</span>
          </button>

          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full border border-white/20"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" stroke="white" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
          </button>

          {/* Photo counter */}
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-white/70 text-xs font-medium tracking-widest">
              PHOTO {displayStep}/{displayTotal}
            </span>
          </div>
        </div>

        {/* Instruction text */}
        <div className="mt-4 px-6 text-center">
          <p className="text-sm text-slate-900">{currentInstruction}</p>
          {currentSkippable && !currentPhoto && (
            <button
              onClick={skipStep}
              className="mt-1 text-sm text-slate-500 underline underline-offset-2"
            >
              {currentSkipLabel}
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        <div
          ref={thumbnailRef}
          className="flex items-center gap-2 mt-4 px-4 overflow-x-auto scrollbar-hide max-w-full"
        >
          {STEPS.map((step, i) => {
            const hasPhoto = photos[i] !== null;
            const isActive = currentStep === i;
            return (
              <button
                key={step.id}
                onClick={() => goToStep(i)}
                className={`flex-shrink-0 w-11 h-11 rounded-lg border-2 flex items-center justify-center transition-all ${
                  isActive
                    ? 'border-white bg-slate-900 ring-2 ring-slate-900'
                    : hasPhoto
                      ? 'border-slate-300 bg-slate-900'
                      : 'border-slate-200 bg-white'
                }`}
              >
                {hasPhoto && previewUrls[i] ? (
                  <img src={previewUrls[i]} alt="" className="w-full h-full object-cover rounded-md" />
                ) : (
                  <StepIcon stepId={step.id} size={22} color={isActive || hasPhoto ? '#fff' : '#1e293b'} />
                )}
              </button>
            );
          })}
          {/* Extra photo slots */}
          {Array.from({ length: MAX_EXTRAS }).map((_, i) => {
            const idx = STEPS.length + i;
            const hasPhoto = extraPhotos[i] !== undefined;
            const isActive = currentStep === idx;
            // Only show if previous extras are filled or this is the next available
            const shouldShow = i === 0 || extraPhotos[i - 1] !== undefined;
            if (!shouldShow && !hasPhoto) return null;
            return (
              <button
                key={`extra-${i}`}
                onClick={() => goToStep(idx)}
                className={`flex-shrink-0 w-11 h-11 rounded-lg border-2 flex items-center justify-center transition-all ${
                  isActive
                    ? 'border-white bg-slate-900 ring-2 ring-slate-900'
                    : hasPhoto
                      ? 'border-slate-300 bg-slate-900'
                      : 'border-slate-200 bg-white'
                }`}
              >
                {hasPhoto && extraPreviewUrls[i] ? (
                  <img src={extraPreviewUrls[i]} alt="" className="w-full h-full object-cover rounded-md" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <line x1="11" y1="5" x2="11" y2="17" stroke={isActive ? '#fff' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" />
                    <line x1="5" y1="11" x2="17" y2="11" stroke={isActive ? '#fff' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="pb-8 pt-4 px-6 flex flex-col items-center gap-3 bg-white">
        <div className="flex items-center gap-4">
          {/* Finish button */}
          {(currentStep >= STEPS.length - 1 || capturedCount >= STEPS.length - 1) && canFinish && (
            <button
              onClick={finish}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Finish
            </button>
          )}

          {/* Shutter button — live camera capture or fallback */}
          {!cameraError ? (
            <button
              onClick={captureFrame}
              disabled={!cameraReady || !!currentPreviewUrl}
              className={`w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center transition-transform ${
                currentPreviewUrl ? 'opacity-40' : 'active:scale-95'
              }`}
              aria-label="Take photo"
            >
              <div className="w-12 h-12 rounded-full bg-slate-900 active:bg-slate-700" />
            </button>
          ) : (
            <>
              {/* Fallback shutter for native camera */}
              <button
                onClick={() => fallbackCameraRef.current?.click()}
                className="sm:hidden w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Take photo"
              >
                <div className="w-12 h-12 rounded-full bg-slate-900 active:bg-slate-700" />
              </button>
              {/* Desktop fallback */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="hidden sm:flex w-16 h-16 rounded-full border-4 border-slate-900 items-center justify-center hover:scale-105 transition-transform"
                aria-label="Upload photo"
              >
                <div className="w-12 h-12 rounded-full bg-slate-900" />
              </button>
            </>
          )}
        </div>

        {/* Retake / Upload from library */}
        <div className="flex items-center gap-4">
          {currentPreviewUrl && (
            <button
              onClick={() => {
                // Clear current photo and go back to live camera
                if (isExtraStep) {
                  setExtraPhotos(prev => {
                    const updated = [...prev];
                    updated.splice(extraIndex, 1);
                    return updated;
                  });
                  setExtraPreviewUrls(prev => {
                    const updated = [...prev];
                    if (updated[extraIndex]) URL.revokeObjectURL(updated[extraIndex]);
                    updated.splice(extraIndex, 1);
                    return updated;
                  });
                } else {
                  setPhotos(prev => {
                    const updated = [...prev];
                    updated[currentStep] = null;
                    return updated;
                  });
                  setPreviewUrls(prev => {
                    if (prev[currentStep]) URL.revokeObjectURL(prev[currentStep]);
                    const updated = { ...prev };
                    delete updated[currentStep];
                    return updated;
                  });
                }
              }}
              className="text-xs text-red-500 font-medium underline underline-offset-2"
            >
              Retake
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-slate-500 underline underline-offset-2"
          >
            Upload from library
          </button>
        </div>
      </div>
    </div>
  );
}

// --- GOAT-style guide overlays with SVG mask cutout ---
// Dark semi-transparent overlay covers the viewfinder; the guide shape is a clear window.
// White dashed stroke (12px dash, 8px gap) outlines the guide shape.
// All shapes use smooth cubic bezier curves for clean, geometric, iconic look.

const GUIDE_SHAPES: Record<string, string> = {
  // Tag: centered rectangle frame (~65% wide, ~55% tall) with rounded corners
  tag: 'M 62,58 Q 52,58 52,68 L 52,232 Q 52,242 62,242 L 238,242 Q 248,242 248,232 L 248,68 Q 248,58 238,58 Z',

  // Lateral/outer: two simplified shoe profiles, toes pointing right
  outer: [
    'M 18,192 L 148,192 C 165,192 172,178 170,164 C 168,155 160,149 150,146',
    'L 75,135 C 48,129 28,135 25,152 C 22,165 20,178 18,192 Z',
    'M 130,218 L 260,218 C 277,218 284,204 282,190 C 280,181 272,175 262,172',
    'L 187,161 C 160,155 140,161 137,178 C 134,191 132,204 130,218 Z',
  ].join(' '),

  // Medial/inner: two shoe profiles mirrored, toes pointing left
  inner: [
    'M 282,192 L 152,192 C 135,192 128,178 130,164 C 132,155 140,149 150,146',
    'L 225,135 C 252,129 272,135 275,152 C 278,165 280,178 282,192 Z',
    'M 170,218 L 40,218 C 23,218 16,204 18,190 C 20,181 28,175 38,172',
    'L 113,161 C 140,155 160,161 163,178 C 166,191 168,204 170,218 Z',
  ].join(' '),

  // Top down: two elongated teardrop/oval shapes (bird's-eye), wider at toe
  top: [
    'M 105,32 C 132,32 142,52 142,75 L 142,220 C 142,252 126,270 105,270',
    'C 84,270 68,252 68,220 L 68,75 C 68,52 78,32 105,32 Z',
    'M 195,32 C 222,32 232,52 232,75 L 232,220 C 232,252 216,270 195,270',
    'C 174,270 158,252 158,220 L 158,75 C 158,52 168,32 195,32 Z',
  ].join(' '),

  // Back/heels: two U-shapes (tombstone) side by side
  back: [
    'M 35,252 L 35,118 C 35,68 60,52 90,52 C 120,52 145,68 145,118 L 145,252 Z',
    'M 155,252 L 155,118 C 155,68 180,52 210,52 C 240,52 265,68 265,118 L 265,252 Z',
  ].join(' '),

  // Outsoles: two elongated sole outlines side by side
  soles: [
    'M 100,30 C 125,25 140,42 142,62 L 144,225 C 142,252 126,268 105,268',
    'C 84,268 68,252 66,225 L 68,62 C 70,42 82,25 100,30 Z',
    'M 200,30 C 225,25 240,42 242,62 L 244,225 C 242,252 226,268 205,268',
    'C 184,268 168,252 166,225 L 168,62 C 170,42 182,25 200,30 Z',
  ].join(' '),
};

function Silhouette({ stepId }: { stepId: string }) {
  const shapePath = GUIDE_SHAPES[stepId];

  // Steps with mask cutout overlay
  if (shapePath) {
    const maskId = `guide-mask-${stepId}`;
    return (
      <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
        <defs>
          <mask id={maskId}>
            <rect width="300" height="300" fill="white" />
            <path d={shapePath} fill="black" />
          </mask>
        </defs>
        {/* Dark overlay with clear cutout window */}
        <rect width="300" height="300" fill="rgba(0,0,0,0.4)" mask={`url(#${maskId})`} />
        {/* White dashed outline around the guide shape */}
        <path
          d={shapePath}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="12 8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Issues/extra: corner brackets frame (no mask needed)
  return (
    <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
      <path d="M40,90 L40,50 Q40,40 50,40 L90,40" fill="none" stroke="white" strokeWidth="2" strokeDasharray="12 8" strokeLinecap="round" />
      <path d="M210,40 L250,40 Q260,40 260,50 L260,90" fill="none" stroke="white" strokeWidth="2" strokeDasharray="12 8" strokeLinecap="round" />
      <path d="M40,210 L40,250 Q40,260 50,260 L90,260" fill="none" stroke="white" strokeWidth="2" strokeDasharray="12 8" strokeLinecap="round" />
      <path d="M210,260 L250,260 Q260,260 260,250 L260,210" fill="none" stroke="white" strokeWidth="2" strokeDasharray="12 8" strokeLinecap="round" />
      <line x1="150" y1="130" x2="150" y2="170" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="130" y1="150" x2="170" y2="150" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// --- Step icon for thumbnail strip ---

function StepIcon({ stepId, size, color }: { stepId: string; size: number; color: string }) {
  const s = size;
  const c = color;

  switch (stepId) {
    case 'tag':
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <rect x="3" y="5" width="16" height="12" rx="2" stroke={c} strokeWidth="1.5" />
          <line x1="6" y1="9" x2="16" y2="9" stroke={c} strokeWidth="1" />
          <line x1="6" y1="12" x2="13" y2="12" stroke={c} strokeWidth="1" />
        </svg>
      );
    case 'outer':
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M3,16 L3,10 Q3,5 8,4 L14,4 Q17,4 18,7 L19,10 Q20,13 20,15 L20,16 Z" stroke={c} strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'inner':
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M19,16 L19,10 Q19,5 14,4 L8,4 Q5,4 4,7 L3,10 Q2,13 2,15 L2,16 Z" stroke={c} strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'top':
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <ellipse cx="8" cy="11" rx="4" ry="8" stroke={c} strokeWidth="1.3" />
          <ellipse cx="14" cy="11" rx="4" ry="8" stroke={c} strokeWidth="1.3" />
        </svg>
      );
    case 'back':
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <rect x="3" y="5" width="6" height="13" rx="2" stroke={c} strokeWidth="1.3" />
          <rect x="13" y="5" width="6" height="13" rx="2" stroke={c} strokeWidth="1.3" />
        </svg>
      );
    case 'soles':
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <ellipse cx="11" cy="9" rx="8" ry="4" stroke={c} strokeWidth="1.3" />
          <ellipse cx="11" cy="13" rx="8" ry="4" stroke={c} strokeWidth="1.3" />
        </svg>
      );
    case 'issues':
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <rect x="3" y="3" width="16" height="16" rx="3" stroke={c} strokeWidth="1.3" strokeDasharray="3 2" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <line x1="11" y1="5" x2="11" y2="17" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="11" x2="17" y2="11" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}
