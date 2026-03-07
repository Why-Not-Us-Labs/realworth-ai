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
  // Tag: sneaker tongue pulled back showing tag area — rectangle with tongue flap
  tag: [
    // Main tag area (rectangle with rounded corners)
    'M 80,75 Q 75,75 75,80 L 75,220 Q 75,225 80,225 L 220,225 Q 225,225 225,220 L 225,80 Q 225,75 220,75 Z',
    // Tongue flap above (pulled back to reveal tag)
    'M 95,75 L 95,55 C 95,42 110,35 150,35 C 190,35 205,42 205,55 L 205,75',
    // Tag detail lines inside
    'M 100,110 L 200,110 M 100,130 L 180,130 M 100,150 L 190,150 M 100,170 L 160,170',
  ].join(' '),

  // Lateral/outer: two realistic sneaker profiles (right-facing), one offset behind
  outer: [
    // Back shoe (offset up-left) — full AF1-style profile
    'M 20,168 L 20,175 L 155,175',
    'C 162,175 168,172 172,166 C 175,160 174,153 170,148', // toe box curve
    'L 155,138 C 148,132 130,125 115,123', // vamp/throat
    'L 90,120 C 75,118 60,119 50,124', // tongue base area
    'C 38,130 28,142 24,155 C 22,162 20,166 20,168 Z', // heel counter
    // Front shoe (offset down-right) — same profile
    'M 60,198 L 60,205 L 195,205',
    'C 202,205 208,202 212,196 C 215,190 214,183 210,178', // toe box
    'L 195,168 C 188,162 170,155 155,153', // vamp
    'L 130,150 C 115,148 100,149 90,154', // tongue
    'C 78,160 68,172 64,185 C 62,192 60,196 60,198 Z', // heel
    // Midsole lines
    'M 20,175 L 155,175 M 60,205 L 195,205',
  ].join(' '),

  // Medial/inner: two sneaker profiles mirrored (left-facing)
  inner: [
    // Back shoe (right side)
    'M 280,168 L 280,175 L 145,175',
    'C 138,175 132,172 128,166 C 125,160 126,153 130,148',
    'L 145,138 C 152,132 170,125 185,123',
    'L 210,120 C 225,118 240,119 250,124',
    'C 262,130 272,142 276,155 C 278,162 280,166 280,168 Z',
    // Front shoe (left side)
    'M 240,198 L 240,205 L 105,205',
    'C 98,205 92,202 88,196 C 85,190 86,183 90,178',
    'L 105,168 C 112,162 130,155 145,153',
    'L 170,150 C 185,148 200,149 210,154',
    'C 222,160 232,172 236,185 C 238,192 240,196 240,198 Z',
    // Midsole lines
    'M 280,175 L 145,175 M 240,205 L 105,205',
  ].join(' '),

  // Top down: two sneakers from above with lacing detail, wider at toe
  top: [
    // Left shoe — wider toe, narrower heel, slight toe-out angle
    'M 85,265 C 65,260 55,245 52,225 L 48,120 C 46,80 55,50 70,38',
    'C 80,30 92,28 100,30 C 108,32 115,38 118,48',
    'L 122,120 L 126,225 C 128,245 120,260 108,265 C 100,268 90,268 85,265 Z',
    // Left shoe lacing (3 cross-laces)
    'M 72,80 L 102,85 M 70,105 L 104,108 M 68,130 L 106,132',
    // Left shoe tongue
    'M 78,55 L 78,38 C 78,30 88,26 93,30 L 93,55',
    // Right shoe — mirror
    'M 215,265 C 235,260 245,245 248,225 L 252,120 C 254,80 245,50 230,38',
    'C 220,30 208,28 200,30 C 192,32 185,38 182,48',
    'L 178,120 L 174,225 C 172,245 180,260 192,265 C 200,268 210,268 215,265 Z',
    // Right shoe lacing
    'M 228,80 L 198,85 M 230,105 L 196,108 M 232,130 L 194,132',
    // Right shoe tongue
    'M 222,55 L 222,38 C 222,30 212,26 207,30 L 207,55',
  ].join(' '),

  // Back/heels: two heel counters with recognizable heel cup, pull tabs, midsole
  back: [
    // Left heel — rounded heel cup shape
    'M 40,245 L 40,175 C 40,140 50,110 65,90 C 75,78 85,72 95,70',
    'L 95,55 L 85,55 L 85,48 L 105,48 L 105,55 L 95,55', // Pull tab
    'C 105,72 115,78 125,90 C 140,110 150,140 150,175 L 150,245 Z',
    // Left heel collar
    'M 50,110 C 60,95 80,85 95,84 C 110,85 130,95 140,110',
    // Left midsole
    'M 38,245 L 152,245 L 152,255 L 38,255 Z',
    // Right heel
    'M 160,245 L 160,175 C 160,140 170,110 185,90 C 195,78 205,72 215,70',
    'L 215,55 L 205,55 L 205,48 L 225,48 L 225,55 L 215,55',
    'C 225,72 235,78 245,90 C 260,110 270,140 270,175 L 270,245 Z',
    // Right heel collar
    'M 170,110 C 180,95 200,85 215,84 C 230,85 250,95 260,110',
    // Right midsole
    'M 158,245 L 272,245 L 272,255 L 158,255 Z',
  ].join(' '),

  // Outsoles: two shoe soles tilted/stacked, showing tread outline — forefoot wider, waist narrow
  soles: [
    // Left sole — tilted, tread visible
    'M 85,28 C 108,24 125,35 130,55 L 136,110',
    'C 138,125 134,135 128,140', // waist narrows
    'L 132,180 C 136,210 130,245 110,262',
    'C 96,272 78,268 68,252',
    'L 56,200 C 48,178 46,155 50,140',
    'C 52,130 56,122 62,118', // waist
    'L 58,65 C 56,42 65,28 85,28 Z',
    // Tread pattern lines on left sole
    'M 72,70 L 110,60 M 68,100 L 118,92 M 62,140 L 118,138',
    'M 65,185 L 120,178 M 78,225 L 118,215',
    // Right sole — offset, tilted
    'M 185,38 C 208,34 225,45 230,65 L 236,120',
    'C 238,135 234,145 228,150',
    'L 232,190 C 236,220 230,255 210,272',
    'C 196,282 178,278 168,262',
    'L 156,210 C 148,188 146,165 150,150',
    'C 152,140 156,132 162,128',
    'L 158,75 C 156,52 165,38 185,38 Z',
    // Tread lines on right sole
    'M 172,80 L 210,70 M 168,110 L 218,102 M 162,150 L 218,148',
    'M 165,195 L 220,188 M 178,235 L 218,225',
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
      // Tongue pulled back with tag visible
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <rect x="4" y="7" width="14" height="12" rx="1.5" stroke={c} strokeWidth="1.4" />
          <path d="M7,7 L7,4 C7,3 9,2 11,2 C13,2 15,3 15,4 L15,7" stroke={c} strokeWidth="1.2" fill="none" />
          <line x1="7" y1="11" x2="15" y2="11" stroke={c} strokeWidth="0.8" />
          <line x1="7" y1="14" x2="13" y2="14" stroke={c} strokeWidth="0.8" />
        </svg>
      );
    case 'outer':
      // Sneaker profile facing right
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M2,16 L2,17 L19,17 C20,17 21,16 20,14 L18,12 C16,10 13,9 10,8.5 L7,8 C5,8 3,10 2.5,13 Z" stroke={c} strokeWidth="1.4" fill="none" />
          <line x1="2" y1="17" x2="19" y2="17" stroke={c} strokeWidth="0.8" />
        </svg>
      );
    case 'inner':
      // Sneaker profile facing left (mirrored)
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M20,16 L20,17 L3,17 C2,17 1,16 2,14 L4,12 C6,10 9,9 12,8.5 L15,8 C17,8 19,10 19.5,13 Z" stroke={c} strokeWidth="1.4" fill="none" />
          <line x1="20" y1="17" x2="3" y2="17" stroke={c} strokeWidth="0.8" />
        </svg>
      );
    case 'top':
      // Two shoes from above with lace hints
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M6,19 C4,18 3,15 3,11 L3.5,5 C4,3 5,2 7,2 C9,2 9.5,3 9.5,5 L10,11 C10,15 9,18 8,19 Z" stroke={c} strokeWidth="1.2" fill="none" />
          <path d="M16,19 C18,18 19,15 19,11 L18.5,5 C18,3 17,2 15,2 C13,2 12.5,3 12.5,5 L12,11 C12,15 13,18 14,19 Z" stroke={c} strokeWidth="1.2" fill="none" />
          <line x1="4.5" y1="7" x2="8" y2="7.5" stroke={c} strokeWidth="0.6" />
          <line x1="17.5" y1="7" x2="14" y2="7.5" stroke={c} strokeWidth="0.6" />
        </svg>
      );
    case 'back':
      // Two heel cups with pull tabs
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M2,19 L2,12 C2,7 4,5 6,5 L6,3 L8,3 L8,5 C10,5 12,7 12,12 L12,19 Z" stroke={c} strokeWidth="1.2" fill="none" />
          <path d="M11,19 L11,12 C11,7 13,5 15,5 L15,3 L17,3 L17,5 C19,5 21,7 21,12 L21,19 Z" stroke={c} strokeWidth="1.2" fill="none" />
          <line x1="1" y1="19" x2="13" y2="19" stroke={c} strokeWidth="0.8" />
          <line x1="10" y1="19" x2="22" y2="19" stroke={c} strokeWidth="0.8" />
        </svg>
      );
    case 'soles':
      // Two sole outlines, tilted/stacked
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
