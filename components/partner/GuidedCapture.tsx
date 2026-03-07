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
  // Tag: clean rectangular frame — "center the tag in this box"
  tag: [
    // Rounded rectangle frame
    'M 65,40 Q 60,40 60,45 L 60,255 Q 60,260 65,260 L 235,260 Q 240,260 240,255 L 240,45 Q 240,40 235,40 Z',
    // Text line hints inside
    'M 82,80 L 218,80', 'M 82,108 L 198,108', 'M 82,136 L 210,136', 'M 82,164 L 178,164',
    // Small QR code block hint (bottom-left)
    'M 82,195 L 128,195 L 128,240 L 82,240 Z',
  ].join(' '),

  // Lateral/outer: two right-facing sneaker profiles, stacked vertically
  // Proportions: long and low (~3.5:1), flat sole, defined toe box, midsole band, collar notch
  outer: [
    // --- Top shoe (y: 55–135) ---
    'M 30,135 L 260,135', // sole
    'C 270,135 276,128 276,118', // toe box front curve
    'C 276,108 268,100 258,97', // toe box top
    'L 185,80', // vamp
    'C 155,74 120,72 95,76', // mid-upper
    'L 62,85', // toward collar
    'C 53,90 48,86 45,82', // collar notch dip
    'C 41,78 38,82 37,88', // heel top
    'C 34,100 32,115 31,128', // heel counter
    'L 30,135 Z',
    // Midsole band
    'M 30,128 L 260,128',

    // --- Bottom shoe (y: 165–245) ---
    'M 30,245 L 260,245',
    'C 270,245 276,238 276,228',
    'C 276,218 268,210 258,207',
    'L 185,190',
    'C 155,184 120,182 95,186',
    'L 62,195',
    'C 53,200 48,196 45,192',
    'C 41,188 38,192 37,198',
    'C 34,210 32,225 31,238',
    'L 30,245 Z',
    'M 30,238 L 260,238',
  ].join(' '),

  // Medial/inner: two left-facing sneaker profiles (mirror of outer)
  inner: [
    // --- Top shoe (y: 55–135) ---
    'M 270,135 L 40,135',
    'C 30,135 24,128 24,118',
    'C 24,108 32,100 42,97',
    'L 115,80',
    'C 145,74 180,72 205,76',
    'L 238,85',
    'C 247,90 252,86 255,82',
    'C 259,78 262,82 263,88',
    'C 266,100 268,115 269,128',
    'L 270,135 Z',
    'M 270,128 L 40,128',

    // --- Bottom shoe (y: 165–245) ---
    'M 270,245 L 40,245',
    'C 30,245 24,238 24,228',
    'C 24,218 32,210 42,207',
    'L 115,190',
    'C 145,184 180,182 205,186',
    'L 238,195',
    'C 247,200 252,196 255,192',
    'C 259,188 262,192 263,198',
    'C 266,210 268,225 269,238',
    'L 270,245 Z',
    'M 270,238 L 40,238',
  ].join(' '),

  // Top-down: two sneakers from above, side by side — wide toe, narrow heel, lacing
  top: [
    // Left shoe — wider toe, narrower heel, slight toe-out angle
    'M 82,268 C 62,262 50,245 48,222 L 44,125 C 42,85 52,50 68,38',
    'C 78,30 92,27 100,30 C 108,33 115,40 118,52',
    'L 122,125 L 126,222 C 128,245 118,262 104,268 C 96,271 88,271 82,268 Z',
    // Left shoe lacing
    'M 66,78 L 100,82', 'M 64,103 L 102,106', 'M 62,128 L 104,130',
    // Left shoe toe cap line
    'M 56,240 C 65,252 90,255 112,245',

    // Right shoe — mirror
    'M 218,268 C 238,262 250,245 252,222 L 256,125 C 258,85 248,50 232,38',
    'C 222,30 208,27 200,30 C 192,33 185,40 182,52',
    'L 178,125 L 174,222 C 172,245 182,262 196,268 C 204,271 212,271 218,268 Z',
    // Right shoe lacing
    'M 234,78 L 200,82', 'M 236,103 L 198,106', 'M 238,128 L 196,130',
    // Right shoe toe cap line
    'M 244,240 C 235,252 210,255 188,245',
  ].join(' '),

  // Back/heels: two NARROW heel counters — hourglass shape, pull tabs, collar, midsole
  // Each heel ~27% of frame width (80px), with gap between
  back: [
    // --- Left heel (x: 55–145) ---
    // Outer shape: hourglass — wider at heel cup + collar, narrower at ankle
    'M 60,250 L 60,195',
    'C 60,170 65,150 72,138', // heel cup curves in (narrower at ankle)
    'C 78,128 84,118 88,108', // ankle area (narrowest)
    'C 92,98 96,90 100,82', // up toward collar
    // Pull tab
    'L 100,68 L 93,68 L 93,58 L 107,58 L 107,68 L 100,68',
    // Right side back down
    'C 104,90 108,98 112,108',
    'C 116,118 122,128 128,138',
    'C 135,150 140,170 140,195',
    'L 140,250 Z',
    // Collar opening (U shape at top)
    'M 72,120 C 80,105 92,98 100,97 C 108,98 120,105 128,120',
    // Midsole
    'M 56,250 L 144,250 L 144,262 L 56,262 Z',

    // --- Right heel (x: 160–250) ---
    'M 165,250 L 165,195',
    'C 165,170 170,150 177,138',
    'C 183,128 189,118 193,108',
    'C 197,98 201,90 205,82',
    'L 205,68 L 198,68 L 198,58 L 212,58 L 212,68 L 205,68',
    'C 209,90 213,98 217,108',
    'C 221,118 227,128 233,138',
    'C 240,150 245,170 245,195',
    'L 245,250 Z',
    // Collar opening
    'M 177,120 C 185,105 197,98 205,97 C 213,98 225,105 233,120',
    // Midsole
    'M 161,250 L 249,250 L 249,262 L 161,262 Z',
  ].join(' '),

  // Outsoles: two soles stacked with offset — forefoot wider, arch narrows, heel narrower
  soles: [
    // Top sole
    'M 85,25 C 110,20 128,34 133,55 L 138,108',
    'C 140,122 136,132 130,137', // waist narrows at arch
    'L 134,178 C 138,208 132,242 112,260',
    'C 98,270 80,266 70,250',
    'L 58,198 C 50,178 48,155 52,140',
    'C 54,131 58,124 64,120', // waist
    'L 60,62 C 58,40 68,25 85,25 Z',
    // Tread lines
    'M 72,65 L 115,55', 'M 68,95 L 120,88', 'M 64,137 L 120,134',
    'M 68,182 L 122,176', 'M 78,222 L 120,212',

    // Bottom sole (offset right)
    'M 192,38 C 217,33 235,47 240,68 L 245,118',
    'C 247,132 243,142 237,147',
    'L 241,188 C 245,218 239,252 219,270',
    'C 205,280 187,276 177,260',
    'L 165,208 C 157,188 155,165 159,150',
    'C 161,141 165,134 171,130',
    'L 167,72 C 165,50 174,38 192,38 Z',
    // Tread lines
    'M 179,75 L 222,66', 'M 175,105 L 227,98', 'M 171,147 L 227,144',
    'M 175,192 L 229,186', 'M 185,232 L 227,222',
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
      // Clean rectangle frame (tag label)
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <rect x="4" y="3" width="14" height="16" rx="1.5" stroke={c} strokeWidth="1.4" />
          <line x1="7" y1="7" x2="15" y2="7" stroke={c} strokeWidth="0.8" />
          <line x1="7" y1="10" x2="13" y2="10" stroke={c} strokeWidth="0.8" />
          <rect x="7" y="13" width="4" height="4" rx="0.5" stroke={c} strokeWidth="0.7" />
        </svg>
      );
    case 'outer':
      // Low-profile sneaker facing right with flat sole
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M2,15 L19,15 C20.5,15 21,13.5 21,12.5 C21,11 20,10 19,9.5 L13,7.5 C10,6.5 7,6.5 5,7.2 C3.5,8 2.8,7.5 2.5,7 C2.2,6.5 2,7 2,7.8 C2,9.5 2,13 2,15 Z" stroke={c} strokeWidth="1.3" fill="none" />
          <line x1="2" y1="14" x2="19" y2="14" stroke={c} strokeWidth="0.7" />
        </svg>
      );
    case 'inner':
      // Low-profile sneaker facing left with flat sole
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M20,15 L3,15 C1.5,15 1,13.5 1,12.5 C1,11 2,10 3,9.5 L9,7.5 C12,6.5 15,6.5 17,7.2 C18.5,8 19.2,7.5 19.5,7 C19.8,6.5 20,7 20,7.8 C20,9.5 20,13 20,15 Z" stroke={c} strokeWidth="1.3" fill="none" />
          <line x1="20" y1="14" x2="3" y2="14" stroke={c} strokeWidth="0.7" />
        </svg>
      );
    case 'top':
      // Two shoes from above — wide toe, narrow heel
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M6,19 C4,18 3,15 3,11 L3.5,5 C4,3 5,2 7,2 C9,2 9.5,3 9.5,5 L10,11 C10,15 9,18 8,19 Z" stroke={c} strokeWidth="1.2" fill="none" />
          <path d="M16,19 C18,18 19,15 19,11 L18.5,5 C18,3 17,2 15,2 C13,2 12.5,3 12.5,5 L12,11 C12,15 13,18 14,19 Z" stroke={c} strokeWidth="1.2" fill="none" />
          <line x1="4.5" y1="7" x2="8" y2="7.5" stroke={c} strokeWidth="0.6" />
          <line x1="17.5" y1="7" x2="14" y2="7.5" stroke={c} strokeWidth="0.6" />
        </svg>
      );
    case 'back':
      // Two narrow heel counters with hourglass shape and pull tabs
      return (
        <svg width={s} height={s} viewBox="0 0 22 22" fill="none">
          <path d="M3,19 L3,13 C3,10 4,8 5.5,7 C6,6.5 6.5,5.5 7,4 L7,3 L6.5,3 L6.5,2 L8.5,2 L8.5,3 L8,3 L8,4 C8.5,5.5 9,6.5 9.5,7 C11,8 12,10 12,13 L12,19 Z" stroke={c} strokeWidth="1.1" fill="none" />
          <path d="M11,19 L11,13 C11,10 12,8 13.5,7 C14,6.5 14.5,5.5 15,4 L15,3 L14.5,3 L14.5,2 L16.5,2 L16.5,3 L16,3 L16,4 C16.5,5.5 17,6.5 17.5,7 C19,8 20,10 20,13 L20,19 Z" stroke={c} strokeWidth="1.1" fill="none" />
          <line x1="2" y1="19" x2="13" y2="19" stroke={c} strokeWidth="0.8" />
          <line x1="10" y1="19" x2="21" y2="19" stroke={c} strokeWidth="0.8" />
        </svg>
      );
    case 'soles':
      // Two sole outlines — wide forefoot, narrow waist
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
