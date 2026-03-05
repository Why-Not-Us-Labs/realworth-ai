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

// --- Silhouette overlays (large, detailed, GOAT-style) ---

function Silhouette({ stepId }: { stepId: string }) {
  const strokeProps = {
    stroke: 'rgba(255,255,255,0.5)',
    strokeWidth: 2,
    strokeDasharray: '6 4',
    fill: 'none' as const,
  };

  switch (stepId) {
    case 'tag':
      // Large rectangular tag with text lines — fills ~60% of frame
      return (
        <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
          <rect x="55" y="65" width="190" height="170" rx="10" {...strokeProps} />
          {/* Text line placeholders */}
          <line x1="80" y1="110" x2="220" y2="110" {...strokeProps} />
          <line x1="80" y1="140" x2="200" y2="140" {...strokeProps} />
          <line x1="80" y1="170" x2="210" y2="170" {...strokeProps} />
          <line x1="80" y1="200" x2="160" y2="200" {...strokeProps} />
        </svg>
      );

    case 'outer':
      // Two detailed lateral sneaker profiles facing right — fills ~75%
      return (
        <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
          {/* Front shoe */}
          <path d={`
            M30,195 L30,140 Q30,120 40,108 Q50,95 65,88 L95,78 Q115,72 130,70 L160,68
            Q180,68 195,75 L205,82 Q215,90 220,100 L228,115
            Q232,125 245,130 L258,135 Q268,140 270,150 L270,165 L270,195
            Q270,200 265,200 L35,200 Q30,200 30,195 Z
          `} {...strokeProps} />
          {/* Midsole line front shoe */}
          <path d="M30,195 Q150,190 270,195" {...strokeProps} strokeWidth={1.5} opacity={0.4} />

          {/* Back shoe (offset down and right) */}
          <path d={`
            M45,225 L45,170 Q45,150 55,138 Q65,125 80,118 L110,108 Q130,102 145,100 L175,98
            Q195,98 210,105 L220,112 Q230,120 235,130 L243,145
            Q247,155 260,160 L273,165 Q283,170 285,180 L285,195 L285,225
            Q285,230 280,230 L50,230 Q45,230 45,225 Z
          `} {...strokeProps} />
          <path d="M45,225 Q165,220 285,225" {...strokeProps} strokeWidth={1.5} opacity={0.4} />
        </svg>
      );

    case 'inner':
      // Two detailed medial profiles facing left (mirrored) — fills ~75%
      return (
        <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
          {/* Front shoe (mirrored) */}
          <path d={`
            M270,195 L270,140 Q270,120 260,108 Q250,95 235,88 L205,78 Q185,72 170,70 L140,68
            Q120,68 105,75 L95,82 Q85,90 80,100 L72,115
            Q68,125 55,130 L42,135 Q32,140 30,150 L30,165 L30,195
            Q30,200 35,200 L265,200 Q270,200 270,195 Z
          `} {...strokeProps} />
          <path d="M270,195 Q150,190 30,195" {...strokeProps} strokeWidth={1.5} opacity={0.4} />

          {/* Back shoe (mirrored, offset) */}
          <path d={`
            M255,225 L255,170 Q255,150 245,138 Q235,125 220,118 L190,108 Q170,102 155,100 L125,98
            Q105,98 90,105 L80,112 Q70,120 65,130 L57,145
            Q53,155 40,160 L27,165 Q17,170 15,180 L15,195 L15,225
            Q15,230 20,230 L250,230 Q255,230 255,225 Z
          `} {...strokeProps} />
          <path d="M255,225 Q135,220 15,225" {...strokeProps} strokeWidth={1.5} opacity={0.4} />
        </svg>
      );

    case 'top':
      // Two elongated foot/insole shapes from above — fills ~80% vertically
      return (
        <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
          {/* Left insole */}
          <path d={`
            M70,40 Q75,25 90,20 L105,18 Q118,18 122,28 L125,45
            Q128,80 127,120 Q126,160 123,195
            Q120,225 112,250 Q105,268 88,272
            Q70,272 63,252 Q56,228 55,195
            Q53,155 54,120 Q55,75 60,50 Q63,42 70,40 Z
          `} {...strokeProps} />

          {/* Right insole */}
          <path d={`
            M230,40 Q225,25 210,20 L195,18 Q182,18 178,28 L175,45
            Q172,80 173,120 Q174,160 177,195
            Q180,225 188,250 Q195,268 212,272
            Q230,272 237,252 Q244,228 245,195
            Q247,155 246,120 Q245,75 240,50 Q237,42 230,40 Z
          `} {...strokeProps} />
        </svg>
      );

    case 'back':
      // Two heel counters from behind with pull tabs — fills ~70%
      return (
        <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
          {/* Left heel */}
          <path d={`
            M35,245 L35,120 Q35,80 55,60 L72,48 Q88,40 100,40 L110,40
            Q125,42 130,60 L130,120 L130,245
            Q130,255 82,255 Q35,255 35,245 Z
          `} {...strokeProps} />
          {/* Left pull tab */}
          <rect x="65" y="30" width="35" height="15" rx="4" {...strokeProps} />
          {/* Left heel counter detail */}
          <path d="M50,180 Q82,170 115,180" {...strokeProps} strokeWidth={1.5} opacity={0.4} />

          {/* Right heel */}
          <path d={`
            M170,245 L170,120 Q170,80 190,60 L207,48 Q223,40 235,40 L245,40
            Q260,42 265,60 L265,120 L265,245
            Q265,255 217,255 Q170,255 170,245 Z
          `} {...strokeProps} />
          {/* Right pull tab */}
          <rect x="200" y="30" width="35" height="15" rx="4" {...strokeProps} />
          {/* Right heel counter detail */}
          <path d="M185,180 Q217,170 250,180" {...strokeProps} strokeWidth={1.5} opacity={0.4} />
        </svg>
      );

    case 'soles':
      // Two large sole outlines stacked/angled — fills most of frame
      return (
        <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
          {/* Bottom sole */}
          <path d={`
            M25,240 Q20,230 18,200 L18,100 Q18,55 50,38 L80,28
            Q100,22 140,20 L200,20 Q240,22 258,38 L272,55
            Q282,75 282,100 L282,200 Q282,235 270,245 L250,252
            Q230,258 190,260 L100,258 Q55,255 38,248 Q28,244 25,240 Z
          `} {...strokeProps} />
          {/* Tread lines */}
          <line x1="50" y1="90" x2="250" y2="90" {...strokeProps} strokeWidth={1.5} opacity={0.3} />
          <line x1="45" y1="140" x2="255" y2="140" {...strokeProps} strokeWidth={1.5} opacity={0.3} />
          <line x1="48" y1="190" x2="252" y2="190" {...strokeProps} strokeWidth={1.5} opacity={0.3} />

          {/* Top sole (overlapping, slightly offset up-left) */}
          <path d={`
            M20,220 Q15,210 13,180 L13,85 Q13,42 45,26 L72,16
            Q92,10 130,8 L188,8 Q228,10 246,26 L260,42
            Q270,60 270,85 L270,180 Q270,215 258,225 L238,232
            Q218,238 178,240 L90,238 Q48,235 33,228 Q23,224 20,220 Z
          `} {...strokeProps} />
        </svg>
      );

    case 'issues':
    case 'extra':
    default:
      // Corner brackets frame — "put anything here"
      return (
        <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
          {/* Top-left bracket */}
          <path d="M40,90 L40,50 Q40,40 50,40 L90,40" {...strokeProps} />
          {/* Top-right bracket */}
          <path d="M210,40 L250,40 Q260,40 260,50 L260,90" {...strokeProps} />
          {/* Bottom-left bracket */}
          <path d="M40,210 L40,250 Q40,260 50,260 L90,260" {...strokeProps} />
          {/* Bottom-right bracket */}
          <path d="M210,260 L250,260 Q260,260 260,250 L260,210" {...strokeProps} />
          {/* Small plus in center */}
          <line x1="150" y1="130" x2="150" y2="170" {...strokeProps} strokeWidth={2.5} />
          <line x1="130" y1="150" x2="170" y2="150" {...strokeProps} strokeWidth={2.5} />
        </svg>
      );
  }
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
