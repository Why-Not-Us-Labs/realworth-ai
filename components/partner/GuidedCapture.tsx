'use client';

import React, { useState, useRef, useCallback } from 'react';

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<(File | null)[]>(new Array(STEPS.length).fill(null));
  const [extraPhotos, setExtraPhotos] = useState<File[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  const [extraPreviewUrls, setExtraPreviewUrls] = useState<string[]>([]);

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

  const goToStep = (step: number) => {
    // Only allow navigating to steps that already have photos or are the next available
    if (step <= currentStep || (step < STEPS.length && photos[step]) || (step >= STEPS.length && extraPhotos[step - STEPS.length])) {
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
    onComplete(allFiles);
  };

  const currentInstruction = isExtraStep
    ? 'Add more photos or finish now.'
    : STEPS[currentStep].instruction;

  const currentSkippable = !isExtraStep && STEPS[currentStep].skippable;
  const currentSkipLabel = !isExtraStep ? STEPS[currentStep].skipLabel : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Hidden inputs */}
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
        accept="image/*,.heic,.heif"
        onChange={onFileChange}
        className="hidden"
      />

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

          {/* Photo preview or silhouette */}
          {currentPreviewUrl ? (
            <img
              src={currentPreviewUrl}
              alt={`Photo ${displayStep}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Silhouette stepId={isExtraStep ? 'extra' : STEPS[currentStep].id} />
            </div>
          )}

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
          {/* Finish button — show after all 7 required steps visited */}
          {(currentStep >= STEPS.length - 1 || capturedCount >= STEPS.length - 1) && canFinish && (
            <button
              onClick={finish}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Finish
            </button>
          )}

          {/* Shutter button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="sm:hidden w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Take photo"
          >
            <div className="w-12 h-12 rounded-full bg-slate-900 active:bg-slate-700" />
          </button>

          {/* Desktop shutter */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="hidden sm:flex w-16 h-16 rounded-full border-4 border-slate-900 items-center justify-center hover:scale-105 transition-transform"
            aria-label="Upload photo"
          >
            <div className="w-12 h-12 rounded-full bg-slate-900" />
          </button>
        </div>

        {/* Upload from library link (mobile) */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="sm:hidden text-xs text-slate-500 underline underline-offset-2"
        >
          Upload from library
        </button>
      </div>
    </div>
  );
}

// --- Silhouette overlays (dotted-line style matching GOAT) ---

function Silhouette({ stepId }: { stepId: string }) {
  const strokeProps = {
    stroke: 'rgba(255,255,255,0.5)',
    strokeWidth: '1.5',
    strokeDasharray: '4 3',
    fill: 'none',
  };

  switch (stepId) {
    case 'tag':
      // Rectangular tag frame
      return (
        <svg width="200" height="200" viewBox="0 0 200 200">
          <rect x="30" y="40" width="140" height="120" rx="6" {...strokeProps} />
          <line x1="50" y1="70" x2="150" y2="70" {...strokeProps} />
          <line x1="50" y1="90" x2="130" y2="90" {...strokeProps} />
          <line x1="50" y1="110" x2="140" y2="110" {...strokeProps} />
          <line x1="50" y1="130" x2="100" y2="130" {...strokeProps} />
        </svg>
      );

    case 'outer':
      // Two shoes lateral profile (outer sides)
      return (
        <svg width="240" height="200" viewBox="0 0 240 200">
          {/* Left shoe */}
          <path d="M20,140 L20,100 Q20,60 60,55 L100,50 Q130,48 140,60 L150,80 Q155,95 180,100 L190,105 Q200,110 200,120 L200,140 Z" {...strokeProps} />
          {/* Right shoe (offset) */}
          <path d="M40,155 L40,115 Q40,75 80,70 L120,65 Q150,63 160,75 L170,95 Q175,110 200,115 L210,120 Q220,125 220,135 L220,155 Z" {...strokeProps} />
        </svg>
      );

    case 'inner':
      // Two shoes medial profile (inner sides, mirrored)
      return (
        <svg width="240" height="200" viewBox="0 0 240 200">
          {/* Left shoe (mirrored) */}
          <path d="M220,140 L220,100 Q220,60 180,55 L140,50 Q110,48 100,60 L90,80 Q85,95 60,100 L50,105 Q40,110 40,120 L40,140 Z" {...strokeProps} />
          {/* Right shoe (mirrored, offset) */}
          <path d="M200,155 L200,115 Q200,75 160,70 L120,65 Q90,63 80,75 L70,95 Q65,110 40,115 L30,120 Q20,125 20,135 L20,155 Z" {...strokeProps} />
        </svg>
      );

    case 'top':
      // Top-down sole outlines
      return (
        <svg width="200" height="220" viewBox="0 0 200 220">
          {/* Left sole */}
          <path d="M30,30 Q30,15 50,12 L65,10 Q80,10 85,20 L88,40 Q90,80 88,120 Q86,160 80,180 Q75,200 55,205 Q35,205 30,185 Q25,160 25,120 Q25,60 30,30 Z" {...strokeProps} />
          {/* Right sole */}
          <path d="M170,30 Q170,15 150,12 L135,10 Q120,10 115,20 L112,40 Q110,80 112,120 Q114,160 120,180 Q125,200 145,205 Q165,205 170,185 Q175,160 175,120 Q175,60 170,30 Z" {...strokeProps} />
        </svg>
      );

    case 'back':
      // Heel view of both shoes
      return (
        <svg width="220" height="200" viewBox="0 0 220 200">
          {/* Left heel */}
          <path d="M25,170 L25,80 Q25,40 50,30 L70,25 Q90,22 95,40 L95,80 L95,170 Q95,180 60,180 Q25,180 25,170 Z" {...strokeProps} />
          {/* Right heel */}
          <path d="M125,170 L125,80 Q125,40 150,30 L170,25 Q190,22 195,40 L195,80 L195,170 Q195,180 160,180 Q125,180 125,170 Z" {...strokeProps} />
          {/* Pull tabs */}
          <rect x="50" y="20" width="30" height="12" rx="3" {...strokeProps} />
          <rect x="145" y="20" width="30" height="12" rx="3" {...strokeProps} />
        </svg>
      );

    case 'soles':
      // Stacked sole view (sideways)
      return (
        <svg width="220" height="220" viewBox="0 0 220 220">
          {/* Bottom sole */}
          <path d="M20,180 Q15,175 15,140 L15,80 Q15,40 40,30 L160,30 Q190,30 200,60 L205,80 Q210,120 205,160 Q200,185 180,190 L40,190 Q25,190 20,180 Z" {...strokeProps} />
          {/* Top sole (stacked, slightly offset) */}
          <path d="M25,160 Q20,155 20,120 L20,65 Q20,30 45,20 L155,15 Q185,15 195,40 L200,60 Q205,95 200,135 Q195,165 175,170 L45,170 Q30,170 25,160 Z" {...strokeProps} />
          {/* Tread lines */}
          <line x1="40" y1="100" x2="180" y2="100" {...strokeProps} opacity="0.4" />
          <line x1="45" y1="130" x2="175" y2="130" {...strokeProps} opacity="0.4" />
          <line x1="50" y1="160" x2="170" y2="160" {...strokeProps} opacity="0.4" />
        </svg>
      );

    case 'issues':
    case 'extra':
    default:
      // Open dotted frame
      return (
        <svg width="200" height="200" viewBox="0 0 200 200">
          <rect x="20" y="20" width="160" height="160" rx="8" {...strokeProps} />
          <line x1="100" y1="70" x2="100" y2="130" {...strokeProps} strokeWidth="2" />
          <line x1="70" y1="100" x2="130" y2="100" {...strokeProps} strokeWidth="2" />
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
