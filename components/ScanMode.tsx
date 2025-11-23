'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

interface ScanModeProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

type ScanType = 'single' | 'collection' | null;

export const ScanMode: React.FC<ScanModeProps> = ({ onCapture, onClose, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanType, setScanType] = useState<ScanType>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Initialize camera
  useEffect(() => {
    if (scanType === null) return;

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
          }
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (error) {
        console.error('Camera error:', error);
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            setCameraError('Camera access denied. Please allow camera permissions in your browser settings.');
          } else if (error.name === 'NotFoundError') {
            setCameraError('No camera found on this device.');
          } else {
            setCameraError('Failed to start camera. Please try again.');
          }
        }
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanType]);

  // Capture image
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);
    setShowFlash(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    setLastCapture(imageData);
    setCaptureCount(prev => prev + 1);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Send to parent
    onCapture(imageData);

    // Reset states
    setTimeout(() => {
      setShowFlash(false);
      setIsCapturing(false);
    }, 300);
  }, [onCapture, isCapturing]);

  // Scan type selection screen
  if (scanType === null) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-black z-50 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Scan Mode</h1>
          <p className="text-slate-400 text-lg">What are you scanning?</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => setScanType('single')}
            className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-left transition-all active:scale-98"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Single Item</h3>
                <p className="text-slate-400 text-sm">Take multiple angles of one item</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setScanType('collection')}
            className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-left transition-all active:scale-98"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Collection</h3>
                <p className="text-slate-400 text-sm">Scan multiple items in a set</p>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-8 text-slate-500 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Camera error screen
  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-6">
        <div className="bg-slate-900 rounded-2xl p-8 max-w-sm text-center border border-slate-800">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Camera Error</h2>
          <p className="text-slate-400 mb-6">{cameraError}</p>
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Video feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash effect */}
      {showFlash && (
        <div className="absolute inset-0 bg-white pointer-events-none animate-flash" />
      )}

      {/* Center guide frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-72 h-72 sm:w-80 sm:h-80">
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-lg" />
        </div>
      </div>

      {/* Dark overlay outside frame */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-black/40" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, calc(50% - 144px) calc(50% - 144px), calc(50% - 144px) calc(50% + 144px), calc(50% + 144px) calc(50% + 144px), calc(50% + 144px) calc(50% - 144px), calc(50% - 144px) calc(50% - 144px))'
        }} />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-14">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              scanType === 'collection' ? 'bg-purple-500 text-white' : 'bg-teal-500 text-white'
            }`}>
              {scanType === 'collection' ? 'Collection' : 'Single Item'}
            </span>
            {captureCount > 0 && (
              <span className="bg-white text-slate-900 px-3 py-1.5 rounded-full text-sm font-bold">
                {captureCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Guidance text */}
      <div className="absolute top-32 left-0 right-0 text-center px-4">
        <p className="text-white text-lg font-medium bg-black/30 backdrop-blur-sm inline-block px-5 py-2 rounded-full">
          {!cameraReady ? 'Starting camera...' :
           isProcessing ? 'Processing...' :
           scanType === 'collection' ? 'Center each item and tap' :
           'Center item and tap to capture'}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-12">
        <div className="flex items-center justify-center gap-8">
          {/* Last capture preview */}
          <div className="w-14 h-14">
            {lastCapture && (
              <div className="w-full h-full rounded-xl overflow-hidden border-2 border-white/50 shadow-lg">
                <img src={lastCapture} alt="Last capture" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Capture button */}
          <button
            onClick={captureImage}
            disabled={!cameraReady || isProcessing || isCapturing}
            className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform ${
              cameraReady && !isProcessing ? 'active:scale-90' : 'opacity-50'
            }`}
          >
            <div className={`w-16 h-16 rounded-full transition-all ${
              isCapturing ? 'bg-teal-500 scale-90' : 'bg-white'
            }`} />
          </button>

          {/* Done button (for collection mode) */}
          <div className="w-14 h-14 flex items-center justify-center">
            {scanType === 'collection' && captureCount >= 1 && (
              <button
                onClick={onClose}
                className="bg-teal-500 text-white px-4 py-2 rounded-full text-sm font-semibold"
              >
                Done
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-white/60 text-sm mt-4">
          {scanType === 'collection'
            ? `Tap capture for each item in your collection`
            : 'Tap to capture'}
        </p>
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-800 font-medium">Appraising...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes flash {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        .animate-flash {
          animation: flash 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
