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
  { id: 'tag', instruction: 'Pull back the tongue and photograph the tag.', skippable: true, skipLabel: 'No Tag?' },
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
  // Traced from GOAT app capture flow — simple outer contours only

  // Tag (GOAT Photo 1/7): dashed rectangle with text line hints
  tag: [
    'M 75,90 Q 70,90 70,95 L 70,210 Q 70,215 75,215 L 225,215 Q 230,215 230,210 L 230,95 Q 230,90 225,90 Z',
    'M 95,125 L 195,125', 'M 95,152 L 210,152', 'M 95,179 L 175,179',
  ].join(' '),

  // Outer (GOAT Photo 2/7): ONE right-facing sneaker profile — flat sole, smooth dome upper
  outer: [
    'M 30,210 L 265,210', // flat sole
    'C 278,210 285,200 282,186', // toe front curve
    'C 278,172 266,162 248,156', // toe box top
    'L 160,138', // vamp
    'C 125,130 95,126 72,130', // mid-upper toward collar
    'C 55,136 44,148 40,165', // collar bump
    'C 36,180 34,195 32,206', // heel counter
    'L 30,210 Z',
  ].join(' '),

  // Inner (mirror of outer): ONE left-facing sneaker profile
  inner: [
    'M 270,210 L 35,210',
    'C 22,210 15,200 18,186',
    'C 22,172 34,162 52,156',
    'L 140,138',
    'C 175,130 205,126 228,130',
    'C 245,136 256,148 260,165',
    'C 264,180 266,195 268,206',
    'L 270,210 Z',
  ].join(' '),

  // Top-down: two shoe outlines from above, wide toe / narrow heel
  top: [
    // Left shoe
    'M 82,268 C 62,262 50,245 48,222 L 44,125 C 42,85 52,50 68,38',
    'C 78,30 92,27 100,30 C 108,33 115,40 118,52',
    'L 122,125 L 126,222 C 128,245 118,262 104,268 C 96,271 88,271 82,268 Z',
    // Right shoe
    'M 218,268 C 238,262 250,245 252,222 L 256,125 C 258,85 248,50 232,38',
    'C 222,30 208,27 200,30 C 192,33 185,40 182,52',
    'L 178,125 L 174,222 C 172,245 182,262 196,268 C 204,271 212,271 218,268 Z',
  ].join(' '),

  // Back (GOAT Photo 5/7): two rounded-top rectangles (tombstone shapes)
  back: [
    // Left heel
    'M 25,255 L 25,115 C 25,72 55,55 80,55 C 105,55 135,72 135,115 L 135,255 Z',
    // Right heel
    'M 165,255 L 165,115 C 165,72 195,55 220,55 C 245,55 275,72 275,115 L 275,255 Z',
  ].join(' '),

  // Soles (GOAT Photo 6/7): two sole outlines tilted/stacked — wide forefoot, narrow waist
  soles: [
    // Top sole
    'M 85,25 C 110,20 128,34 133,55 L 138,108',
    'C 140,122 136,132 130,137',
    'L 134,178 C 138,208 132,242 112,260',
    'C 98,270 80,266 70,250',
    'L 58,198 C 50,178 48,155 52,140',
    'C 54,131 58,124 64,120',
    'L 60,62 C 58,40 68,25 85,25 Z',
    // Bottom sole (offset right)
    'M 192,38 C 217,33 235,47 240,68 L 245,118',
    'C 247,132 243,142 237,147',
    'L 241,188 C 245,218 239,252 219,270',
    'C 205,280 187,276 177,260',
    'L 165,208 C 157,188 155,165 159,150',
    'C 161,141 165,134 171,130',
    'L 167,72 C 165,50 174,38 192,38 Z',
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
      // Rectangle with text lines (matches GOAT)
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <rect x="3" y="5" width="16" height="12" rx="1.5" stroke={c} strokeWidth="1.4" />
          <line x1="6" y1="9" x2="14" y2="9" stroke={c} strokeWidth="0.8" />
          <line x1="6" y1="12" x2="16" y2="12" stroke={c} strokeWidth="0.8" />
          <line x1="6" y1="15" x2="12" y2="15" stroke={c} strokeWidth="0.8" />
        </svg>
      );
    case 'outer':
      // Single shoe profile facing right (matches GOAT)
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M2,16 L20,16 C21,16 21.5,14.5 21,13 C20.5,11.5 19,10.5 17,9.5 L11,7.5 C8,6.5 5.5,6.5 4,7.5 C3,8.5 2.5,10 2.2,12 L2,16 Z" stroke={c} strokeWidth="1.3" fill="none" />
        </svg>
      );
    case 'inner':
      // Single shoe profile facing left (mirror, matches GOAT)
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M20,16 L2,16 C1,16 0.5,14.5 1,13 C1.5,11.5 3,10.5 5,9.5 L11,7.5 C14,6.5 16.5,6.5 18,7.5 C19,8.5 19.5,10 19.8,12 L20,16 Z" stroke={c} strokeWidth="1.3" fill="none" />
        </svg>
      );
    case 'top':
      // Two shoes from above
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M6,19 C4,18 3,15 3,11 L3.5,5 C4,3 5,2 7,2 C9,2 9.5,3 9.5,5 L10,11 C10,15 9,18 8,19 Z" stroke={c} strokeWidth="1.2" fill="none" />
          <path d="M16,19 C18,18 19,15 19,11 L18.5,5 C18,3 17,2 15,2 C13,2 12.5,3 12.5,5 L12,11 C12,15 13,18 14,19 Z" stroke={c} strokeWidth="1.2" fill="none" />
        </svg>
      );
    case 'back':
      // Two simple rounded-top rectangles (tombstone shapes, matches GOAT)
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M2,19 L2,8 C2,4 4,2 6.5,2 C9,2 11,4 11,8 L11,19 Z" stroke={c} strokeWidth="1.2" fill="none" />
          <path d="M12,19 L12,8 C12,4 14,2 16.5,2 C19,2 21,4 21,8 L21,19 Z" stroke={c} strokeWidth="1.2" fill="none" />
        </svg>
      );
    case 'soles':
      // Two sole outlines
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M6,2 C9,1.5 10,3 10.5,6 L11,10 C11,11.5 10.5,12 10,12.5 L10.5,17 C10.5,19 9,21 7,21 C5,21 4,19 3.5,17 L3,12.5 C2.5,12 2,11 2.5,10 L3,6 C3,3.5 4,2 6,2 Z" stroke={c} strokeWidth="1.2" fill="none" />
          <path d="M16,3 C19,2.5 20,4 20.5,7 L21,11 C21,12.5 20.5,13 20,13.5 L20.5,18 C20.5,20 19,22 17,22 C15,22 14,20 13.5,18 L13,13.5 C12.5,13 12,12 12.5,11 L13,7 C13,4.5 14,3 16,3 Z" stroke={c} strokeWidth="1.2" fill="none" />
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
