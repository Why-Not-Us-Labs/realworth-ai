'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useBatchAppraise } from '@/hooks/useBatchAppraise';
import { BULLSEYE_STORES } from '@/lib/partnerConfig';
import BuyOfferCard from '@/components/partner/BuyOfferCard';
import type { BatchItem } from '@/hooks/useBatchAppraise';

function formatMoney(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function BatchPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [storeLocation, setStoreLocation] = useState(BULLSEYE_STORES[0].id);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    items,
    stats,
    isProcessing,
    addItems,
    startProcessing,
    retryItem,
    removeItem,
    clearAll,
  } = useBatchAppraise({
    partnerId: 'bullseye',
    storeLocation,
  });

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    // Each file = 1 sneaker item (1 photo per item for batch intake)
    const groups = files.map(f => [f]);
    addItems(groups);
  }, [addItems]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    if (e.target) e.target.value = '';
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const hasResults = stats.completed > 0 || stats.failed > 0;
  const allDone = isProcessing && stats.pending === 0 && stats.uploading === 0 && stats.processing === 0;

  // If viewing an expanded item result
  if (expandedItem) {
    const item = items.find(i => i.id === expandedItem);
    if (item?.result?.sneakerDetails && item?.result?.buyOffer) {
      return (
        <div className="min-h-screen px-4 py-8 bg-slate-900">
          <button
            onClick={() => setExpandedItem(null)}
            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to batch
          </button>
          <BuyOfferCard
            offer={item.result.buyOffer}
            sneakerDetails={item.result.sneakerDetails}
            itemName={item.result.itemName}
            images={item.result.imageUrls}
            appraisalId={item.result.appraisalId}
            ebayMarketData={item.result.ebayMarketData}
            onAccept={() => setExpandedItem(null)}
            onDecline={() => setExpandedItem(null)}
          />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        onChange={onFileChange}
        className="hidden"
        aria-label="Upload sneaker photos"
      />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/partners/bullseye-logo.png" alt="Bullseye" className="h-7" />
            <span className="text-slate-300 text-sm">x</span>
            <img src="/partners/realworth-collab-logo.png" alt="RealWorth" className="h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Batch Upload</h1>
          <p className="text-sm text-slate-500 mt-1">Upload multiple sneaker photos for bulk pricing</p>
        </div>

        {/* Store selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Store</label>
          <select
            value={storeLocation}
            onChange={(e) => setStoreLocation(e.target.value)}
            disabled={isProcessing}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 disabled:opacity-50"
          >
            {BULLSEYE_STORES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Drop zone — always visible when not processing */}
        {!isProcessing && (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors min-h-[140px] ${
              isDragging
                ? 'border-red-500 bg-red-500/10'
                : 'border-red-400 bg-red-500/5 hover:bg-red-500/10'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-3 text-sm font-semibold text-red-500">
              {items.length === 0 ? 'Drop sneaker photos here' : 'Add more photos'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Each photo = 1 sneaker &middot; Upload as many as you need
            </p>
          </div>
        )}

        {/* Item grid */}
        {items.length > 0 && (
          <div className="mt-6">
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-slate-700">
                {stats.total} item{stats.total !== 1 ? 's' : ''}
                {hasResults && (
                  <span className="text-slate-400 ml-2">
                    {stats.completed} done
                    {stats.failed > 0 && <span className="text-red-500"> &middot; {stats.failed} failed</span>}
                  </span>
                )}
              </div>
              {stats.totalOfferAmount > 0 && (
                <div className="text-sm font-bold text-green-600">
                  Total: {formatMoney(stats.totalOfferAmount)}
                </div>
              )}
            </div>

            {/* Progress bar when processing */}
            {isProcessing && stats.total > 0 && (
              <div className="mb-4">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-500 rounded-full"
                    style={{ width: `${((stats.completed + stats.failed) / stats.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.completed + stats.failed} of {stats.total} complete
                  {stats.processing > 0 && ` \u00B7 ${stats.processing} analyzing`}
                  {stats.uploading > 0 && ` \u00B7 ${stats.uploading} uploading`}
                </p>
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => (
                <BatchItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onRetry={() => retryItem(item.id)}
                  onExpand={() => setExpandedItem(item.id)}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {!isProcessing && stats.pending > 0 && (
                <button
                  onClick={startProcessing}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl text-lg transition-colors"
                >
                  Start Batch ({stats.pending} item{stats.pending !== 1 ? 's' : ''})
                </button>
              )}

              {allDone && (
                <div className="text-center py-4">
                  <div className="text-green-600 font-bold text-lg mb-1">Batch Complete</div>
                  <p className="text-sm text-slate-500">
                    {stats.completed} item{stats.completed !== 1 ? 's' : ''} appraised
                    {stats.totalOfferAmount > 0 && ` \u2014 ${formatMoney(stats.totalOfferAmount)} total`}
                  </p>
                </div>
              )}

              {(allDone || (!isProcessing && hasResults)) && (
                <button
                  onClick={clearAll}
                  className="w-full py-3 border border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl font-medium text-sm transition-colors"
                >
                  New Batch
                </button>
              )}
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <a href="/partner/bullseye" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            &larr; Single item mode
          </a>
        </div>
      </div>
    </div>
  );
}

function BatchItemCard({
  item,
  onRemove,
  onRetry,
  onExpand,
}: {
  item: BatchItem;
  onRemove: () => void;
  onRetry: () => void;
  onExpand: () => void;
}) {
  const isActive = item.status === 'uploading' || item.status === 'processing';
  const isDone = item.status === 'completed';
  const isFailed = item.status === 'failed';

  return (
    <div
      onClick={isDone ? onExpand : undefined}
      className={`relative rounded-xl overflow-hidden border transition-all ${
        isDone
          ? 'border-green-500/30 cursor-pointer hover:border-green-500/60'
          : isFailed
            ? 'border-red-500/30'
            : isActive
              ? 'border-yellow-500/30'
              : 'border-slate-200'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-square relative">
        <img
          src={item.thumbnail}
          alt="Sneaker"
          className={`w-full h-full object-cover ${isActive ? 'opacity-60' : ''}`}
        />

        {/* Status overlay */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isDone && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {isFailed && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        )}

        {/* Remove button — only when pending */}
        {item.status === 'pending' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
          >
            &times;
          </button>
        )}
      </div>

      {/* Info bar */}
      <div className="px-2 py-1.5 bg-white">
        {isDone && item.result ? (
          <>
            <p className="text-xs font-medium text-slate-900 truncate">{item.result.itemName}</p>
            {item.result.buyOffer ? (
              <p className="text-xs font-bold text-green-600">{formatMoney(item.result.buyOffer.amount)}</p>
            ) : (
              <p className="text-xs text-slate-400">No offer</p>
            )}
          </>
        ) : isFailed ? (
          <>
            <p className="text-xs text-red-600 truncate">{item.error || 'Failed'}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="text-xs text-red-500 underline"
            >
              Retry
            </button>
          </>
        ) : isActive ? (
          <p className="text-xs text-slate-500">
            {item.status === 'uploading' ? 'Uploading...' : 'Analyzing...'}
          </p>
        ) : (
          <p className="text-xs text-slate-400">Ready</p>
        )}
      </div>
    </div>
  );
}
