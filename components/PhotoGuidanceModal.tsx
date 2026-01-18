'use client';

import React from 'react';

interface PhotoGuidanceModalProps {
  onClose: () => void;
  onContinue: () => void;
  category?: string; // Optional category for specific guidance
  collectionContext?: {
    setName?: string;
    photographyTips?: string;
  };
}

const categoryGuidance: Record<string, { title: string; tips: string[] }> = {
  Book: {
    title: 'Books & First Editions',
    tips: [
      'Front cover - show title and any dust jacket',
      'Spine - critical for identifying edition',
      'Copyright page - shows printing number',
      'Title page - may have author signature',
      'Any damage, foxing, or wear',
      'Dust jacket back and flaps (if present)',
    ],
  },
  Coin: {
    title: 'Coins & Currency',
    tips: [
      'Obverse (front) - straight on, well-lit',
      'Reverse (back) - same lighting',
      'Edge view - for edge lettering or reeding',
      'Close-up of date and mint mark',
      'Any visible wear, scratches, or toning',
      'Size reference (ruler or common coin)',
    ],
  },
  Art: {
    title: 'Art & Paintings',
    tips: [
      'Full front view - square on, no glare',
      "Artist signature (usually lower corners)",
      "Back of canvas/frame - labels, stamps",
      'Close-up of texture/brushwork',
      'Frame details (if original/period)',
      'Any damage, repairs, or restorations',
    ],
  },
  Jewelry: {
    title: 'Jewelry & Watches',
    tips: [
      'Full piece on neutral background',
      "Hallmarks, stamps, maker's marks",
      'Clasp and closure details',
      'Gemstones close-up (if applicable)',
      'Watch: case back, movement (if visible)',
      'Any damage, missing stones, repairs',
    ],
  },
  Furniture: {
    title: 'Furniture & Antiques',
    tips: [
      'Full front view showing proportions',
      "Maker's marks, labels, stamps (often underneath)",
      'Joinery details (dovetails, etc.)',
      'Hardware (original vs. replaced)',
      'Wood grain and patina details',
      'Any damage, repairs, or refinishing',
    ],
  },
  default: {
    title: 'General Collectibles',
    tips: [
      'Front view - clear, well-lit photo',
      "Maker's marks, signatures, or stamps",
      'Back or bottom (often has labels)',
      'Close-up of any unique features',
      'Size reference for scale',
      'Any damage, repairs, or wear',
    ],
  },
};

export const PhotoGuidanceModal: React.FC<PhotoGuidanceModalProps> = ({
  onClose,
  onContinue,
  category,
  collectionContext,
}) => {
  const guidance = category && categoryGuidance[category]
    ? categoryGuidance[category]
    : categoryGuidance.default;

  // Use collection-specific tips if available
  const collectionTips = collectionContext?.photographyTips
    ? collectionContext.photographyTips.split(/[,.]/).filter(t => t.trim()).map(t => t.trim())
    : null;

  const displayTips = collectionTips || guidance.tips;
  const displayTitle = collectionContext?.setName
    ? `Building: ${collectionContext.setName}`
    : guidance.title;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center pb-[calc(72px+env(safe-area-inset-bottom,0px))] sm:pb-0">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[70vh] sm:max-h-[80vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95 duration-200 sm:m-4 flex flex-col">
        {/* Drag handle for mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header with Stewart */}
        <div className="px-5 py-4 sm:p-6 bg-gradient-to-r from-teal-500 to-teal-600 text-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white text-xl sm:text-2xl font-bold">S</span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Tips from Stewart</h2>
              <p className="text-teal-100 text-xs sm:text-sm">For the best appraisal</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-5 py-4 sm:p-6">
            <h3 className="font-semibold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {displayTitle}
            </h3>

            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              {displayTips.map((tip, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 rounded-xl"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 text-xs sm:text-sm font-semibold">
                    {index + 1}
                  </div>
                  <span className="text-slate-700 text-xs sm:text-sm">{tip}</span>
                </div>
              ))}
            </div>

            {/* Pro tip */}
            <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <div>
                  <p className="font-semibold text-amber-800 text-xs sm:text-sm">Pro Tip</p>
                  <p className="text-amber-700 text-xs sm:text-sm">
                    Natural daylight works best! Avoid flash.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions - sticky at bottom */}
        <div className="p-4 sm:p-6 pt-3 sm:pt-0 flex gap-3 border-t border-slate-100 sm:border-0 bg-white shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors text-sm sm:text-base"
          >
            Later
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3 px-4 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 active:bg-teal-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take Photos
          </button>
        </div>
      </div>
    </div>
  );
};
