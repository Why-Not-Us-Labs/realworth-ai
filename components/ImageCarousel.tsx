'use client';

import React, { useState, useRef, useCallback } from 'react';
import { HeartAnimation } from './HeartAnimation';

type ImageCarouselProps = {
  images: string[];
  alt: string;
  onDoubleTap?: () => void;
  onTap?: () => void;
};

export function ImageCarousel({ images, alt, onDoubleTap, onTap }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  // Handle tap for double-tap detection
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      setShowHeart(true);
      onDoubleTap?.();
      setTimeout(() => setShowHeart(false), 800);
    } else {
      // Single tap - delay to see if it becomes double tap
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 300) {
          onTap?.();
        }
      }, 300);
    }
    lastTapRef.current = now;
  }, [onDoubleTap, onTap]);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      // No swipe, treat as tap
      handleTap();
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (Math.abs(distance) < 10) {
      // Minimal movement, treat as tap
      handleTap();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle click for desktop
  const handleClick = (e: React.MouseEvent) => {
    // Prevent if it was a drag
    if (touchStart !== null) return;
    handleTap();
  };

  // Get all images or fallback to single image
  const allImages = images.length > 0 ? images : [''];

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/5] bg-slate-100 overflow-hidden select-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={handleClick}
    >
      {/* Images container */}
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {allImages.map((img, i) => (
          <div key={i} className="w-full h-full flex-shrink-0">
            {img ? (
              <img
                src={img}
                alt={`${alt} - image ${i + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                <span className="text-slate-400">No image</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dot pagination */}
      {allImages.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {allImages.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(i);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentIndex
                  ? 'bg-teal-500 w-2.5'
                  : 'bg-white/70 hover:bg-white'
              }`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image counter badge (top right) */}
      {allImages.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
          {currentIndex + 1}/{allImages.length}
        </div>
      )}

      {/* Heart animation overlay */}
      <HeartAnimation show={showHeart} />
    </div>
  );
}

export default ImageCarousel;
