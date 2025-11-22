
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

interface ScanModeProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

interface DetectedObject {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

export const ScanMode: React.FC<ScanModeProps> = ({ onCapture, onClose, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const animationRef = useRef<number | null>(null);
  const stableStartRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<DetectedObject | null>(null);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedObject, setDetectedObject] = useState<DetectedObject | null>(null);
  const [stabilityProgress, setStabilityProgress] = useState(0);
  const [captureCount, setCaptureCount] = useState(0);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [showCaptured, setShowCaptured] = useState(false);
  const [guidanceText, setGuidanceText] = useState('Loading AI model...');

  const STABILITY_THRESHOLD = 3000; // 3 seconds
  const DETECTION_INTERVAL = 100; // Run detection every 100ms
  const POSITION_TOLERANCE = 50; // Pixels tolerance for "same position"

  // Initialize camera and model
  useEffect(() => {
    const init = async () => {
      try {
        // Load COCO-SSD model
        setGuidanceText('Loading AI model...');
        const model = await cocoSsd.load({
          base: 'lite_mobilenet_v2' // Lighter model for speed
        });
        modelRef.current = model;
        setIsModelLoading(false);
        setGuidanceText('Starting camera...');

        // Start camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setGuidanceText('Point at an object');
        }
      } catch (error) {
        console.error('Error initializing scan mode:', error);
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            setCameraError('Camera access denied. Please allow camera permissions.');
          } else if (error.name === 'NotFoundError') {
            setCameraError('No camera found on this device.');
          } else {
            setCameraError('Failed to initialize camera: ' + error.message);
          }
        }
      }
    };

    init();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Check if two detections are in similar positions
  const isSimilarPosition = useCallback((det1: DetectedObject | null, det2: DetectedObject | null): boolean => {
    if (!det1 || !det2) return false;
    if (det1.class !== det2.class) return false;

    const [x1, y1, w1, h1] = det1.bbox;
    const [x2, y2, w2, h2] = det2.bbox;

    const centerX1 = x1 + w1 / 2;
    const centerY1 = y1 + h1 / 2;
    const centerX2 = x2 + w2 / 2;
    const centerY2 = y2 + h2 / 2;

    const distance = Math.sqrt(
      Math.pow(centerX1 - centerX2, 2) + Math.pow(centerY1 - centerY2, 2)
    );

    return distance < POSITION_TOLERANCE;
  }, []);

  // Run object detection
  const detectObjects = useCallback(async () => {
    if (!modelRef.current || !videoRef.current || !overlayCanvasRef.current) return;
    if (videoRef.current.readyState !== 4) return;

    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Run detection
    const predictions = await modelRef.current.detect(video);

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find the most prominent object (largest and most confident)
    let bestObject: DetectedObject | null = null;
    let bestScore = 0;

    for (const prediction of predictions) {
      const area = prediction.bbox[2] * prediction.bbox[3];
      const score = prediction.score * (area / (canvas.width * canvas.height));

      if (score > bestScore && prediction.score > 0.5) {
        bestScore = score;
        bestObject = {
          bbox: prediction.bbox as [number, number, number, number],
          class: prediction.class,
          score: prediction.score
        };
      }
    }

    if (bestObject) {
      setDetectedObject(bestObject);

      // Draw bounding box
      const [x, y, width, height] = bestObject.bbox;
      ctx.strokeStyle = '#14B8A6';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      // Draw label
      ctx.fillStyle = '#14B8A6';
      ctx.fillRect(x, y - 25, Math.min(width, 150), 25);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(
        `${bestObject.class} (${Math.round(bestObject.score * 100)}%)`,
        x + 5,
        y - 7
      );

      // Check stability
      if (isSimilarPosition(lastDetectionRef.current, bestObject)) {
        if (!stableStartRef.current) {
          stableStartRef.current = Date.now();
        }

        const elapsed = Date.now() - stableStartRef.current;
        const progress = Math.min(elapsed / STABILITY_THRESHOLD, 1);
        setStabilityProgress(progress);

        // Draw progress ring
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const radius = Math.min(width, height) / 3;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (progress * 2 * Math.PI));
        ctx.strokeStyle = progress === 1 ? '#10B981' : '#14B8A6';
        ctx.lineWidth = 4;
        ctx.stroke();

        if (progress < 1) {
          setGuidanceText('Hold steady...');
        }

        // Auto-capture when stable
        if (elapsed >= STABILITY_THRESHOLD && !isProcessing) {
          captureImage();
          stableStartRef.current = null;
          setStabilityProgress(0);
        }
      } else {
        stableStartRef.current = Date.now();
        setStabilityProgress(0);
        setGuidanceText('Hold steady...');
      }

      lastDetectionRef.current = bestObject;
    } else {
      setDetectedObject(null);
      stableStartRef.current = null;
      setStabilityProgress(0);
      lastDetectionRef.current = null;
      setGuidanceText('Point at an object');
    }
  }, [isSimilarPosition, isProcessing]);

  // Detection loop
  useEffect(() => {
    if (isModelLoading) return;

    let lastDetectionTime = 0;

    const loop = (timestamp: number) => {
      if (timestamp - lastDetectionTime >= DETECTION_INTERVAL) {
        detectObjects();
        lastDetectionTime = timestamp;
      }
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isModelLoading, detectObjects]);

  // Capture image
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    setLastCapture(imageData);
    setShowCaptured(true);
    setCaptureCount(prev => prev + 1);

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // Send to parent
    onCapture(imageData);

    // Hide captured indicator after animation
    setTimeout(() => {
      setShowCaptured(false);
    }, 1000);
  }, [onCapture]);

  // Manual capture
  const handleManualCapture = () => {
    if (!isProcessing) {
      captureImage();
    }
  };

  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-sm text-center">
          <div className="text-4xl mb-4">📷</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Camera Error</h2>
          <p className="text-slate-600 mb-4">{cameraError}</p>
          <button
            onClick={onClose}
            className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg"
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
      />

      {/* Detection overlay */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Captured flash */}
      {showCaptured && (
        <div className="absolute inset-0 bg-white animate-ping pointer-events-none" />
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 pt-12">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-white p-2 rounded-full bg-black/30 backdrop-blur-sm"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {captureCount > 0 && (
            <div className="bg-teal-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {captureCount} scanned
            </div>
          )}
        </div>
      </div>

      {/* Guidance text */}
      <div className="absolute top-1/4 left-0 right-0 text-center">
        <p className="text-white text-lg font-medium bg-black/30 backdrop-blur-sm inline-block px-4 py-2 rounded-full">
          {isModelLoading ? guidanceText : (isProcessing ? 'Processing...' : guidanceText)}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 pb-12">
        <div className="flex items-center justify-center gap-6">
          {/* Last capture preview */}
          {lastCapture && (
            <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-white/50">
              <img src={lastCapture} alt="Last capture" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Manual capture button */}
          <button
            onClick={handleManualCapture}
            disabled={isProcessing || isModelLoading}
            className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center ${
              isProcessing ? 'opacity-50' : 'active:scale-95'
            }`}
          >
            <div className={`w-12 h-12 rounded-full ${
              stabilityProgress > 0
                ? 'bg-teal-500'
                : 'bg-white'
            }`} />
          </button>

          {/* Spacer for symmetry */}
          <div className="w-14 h-14" />
        </div>

        <p className="text-center text-white/70 text-sm mt-4">
          Auto-captures when object is steady for 3 seconds
        </p>
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-700 font-medium">Processing appraisal...</p>
          </div>
        </div>
      )}
    </div>
  );
};
