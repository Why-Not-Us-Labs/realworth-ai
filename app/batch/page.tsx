'use client';

import React, { useState, useRef, useCallback, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AuthContext } from '@/components/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useBatchAppraise } from '@/hooks/useBatchAppraise';
import type { BatchItem } from '@/hooks/useBatchAppraise';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function formatMoney(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function BatchPage() {
  const { user, isAuthLoading } = useContext(AuthContext);
  const { isPro } = useSubscription(user?.id || null, user?.email);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

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
    partnerId: undefined,
    getAuthToken: getAccessToken,
    pathPrefix: user?.id ? `${user.id}/uploads/` : 'uploads/',
  });

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Sign in to use Batch Upload</h2>
        <p className="text-slate-500 text-sm mb-6">Batch upload is available for Pro subscribers.</p>
        <a href="/" className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors">
          Go to Home
        </a>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Pro Feature</h2>
        <p className="text-slate-500 text-sm mb-6">Batch upload is available for Pro subscribers. Upgrade to process multiple items at once.</p>
        <a href="/" className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl transition-colors">
          Go to Home
        </a>
      </div>
    );
  }

  const hasResults = stats.completed > 0 || stats.failed > 0;
  const allDone = isProcessing && stats.pending === 0 && stats.uploading === 0 && stats.processing === 0;

  // Expanded result view
  if (expandedItem) {
    const item = items.find(i => i.id === expandedItem);
    if (item?.result) {
      return (
        <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
          <button
            onClick={() => setExpandedItem(null)}
            className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to batch
          </button>

          {item.result.imageUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {item.result.imageUrls.map((url, i) => (
                <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-32 w-32 rounded-lg object-cover shrink-0 border border-slate-200" />
              ))}
            </div>
          )}

          <h2 className="text-xl font-bold text-slate-900 mb-2">{item.result.itemName}</h2>

          {item.result.sneakerDetails && (
            <div className="text-sm text-slate-500 mb-4">
              {item.result.sneakerDetails.brand} {item.result.sneakerDetails.model}
              {item.result.sneakerDetails.styleCode && item.result.sneakerDetails.styleCode !== 'unknown' && (
                <span className="ml-2 text-slate-400">Style: {item.result.sneakerDetails.styleCode}</span>
              )}
            </div>
          )}

          {item.result.ebayMarketData && item.result.ebayMarketData.sampleSize >= 2 && (
            <div className="rounded-lg border border-slate-200 p-4 mb-4">
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Market Data ({item.result.ebayMarketData.sampleSize} sales)</h3>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div><div className="text-xs text-slate-500">Low</div><div className="font-medium">{formatMoney(item.result.ebayMarketData.low)}</div></div>
                <div><div className="text-xs text-slate-500">Median</div><div className="font-bold">{formatMoney(item.result.ebayMarketData.median)}</div></div>
                <div><div className="text-xs text-slate-500">High</div><div className="font-medium">{formatMoney(item.result.ebayMarketData.high)}</div></div>
              </div>
            </div>
          )}

          {item.result.buyOffer && (
            <div className="text-center py-4 rounded-xl bg-teal-50 border border-teal-200">
              <div className="text-sm text-teal-700 font-medium mb-1">Estimated Value</div>
              <div className="text-3xl font-extrabold text-teal-600">{formatMoney(item.result.buyOffer.amount)}</div>
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        onChange={onFileChange}
        className="hidden"
      />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-900">Batch Upload</h1>
          <p className="text-sm text-slate-500 mt-1">Upload multiple items for bulk appraisal</p>
        </div>

        {/* Drop zone */}
        {!isProcessing && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors min-h-[140px] ${
              isDragging ? 'border-teal-500 bg-teal-500/10' : 'border-teal-400 bg-teal-500/5 hover:bg-teal-500/10'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-3 text-sm font-semibold text-teal-600">
              {items.length === 0 ? 'Drop photos here' : 'Add more photos'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Each photo = 1 item</p>
          </div>
        )}

        {/* Items grid */}
        {items.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-slate-700">
                {stats.total} item{stats.total !== 1 ? 's' : ''}
                {hasResults && <span className="text-slate-400 ml-2">{stats.completed} done</span>}
              </div>
            </div>

            {isProcessing && stats.total > 0 && (
              <div className="mb-4">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-500 rounded-full"
                    style={{ width: `${((stats.completed + stats.failed) / stats.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.completed + stats.failed} of {stats.total} complete
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => (
                <MainBatchItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onRetry={() => retryItem(item.id)}
                  onExpand={() => setExpandedItem(item.id)}
                />
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {!isProcessing && stats.pending > 0 && (
                <button
                  onClick={startProcessing}
                  className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl text-lg transition-colors"
                >
                  Start Batch ({stats.pending} item{stats.pending !== 1 ? 's' : ''})
                </button>
              )}

              {allDone && (
                <div className="text-center py-4">
                  <div className="text-teal-600 font-bold text-lg mb-1">Batch Complete</div>
                  <p className="text-sm text-slate-500">{stats.completed} item{stats.completed !== 1 ? 's' : ''} appraised</p>
                </div>
              )}

              {(allDone || (!isProcessing && hasResults)) && (
                <button onClick={clearAll} className="w-full py-3 border border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl font-medium text-sm transition-colors">
                  New Batch
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            &larr; Back to home
          </a>
        </div>
      </div>
    </div>
  );
}

function MainBatchItemCard({ item, onRemove, onRetry, onExpand }: { item: BatchItem; onRemove: () => void; onRetry: () => void; onExpand: () => void }) {
  const isActive = item.status === 'uploading' || item.status === 'processing';
  const isDone = item.status === 'completed';
  const isFailed = item.status === 'failed';

  return (
    <div
      onClick={isDone ? onExpand : undefined}
      className={`relative rounded-xl overflow-hidden border transition-all ${
        isDone ? 'border-teal-500/30 cursor-pointer hover:border-teal-500/60'
          : isFailed ? 'border-red-500/30'
          : isActive ? 'border-yellow-500/30'
          : 'border-slate-200'
      }`}
    >
      <div className="aspect-square relative">
        <img src={item.thumbnail} alt="Item" className={`w-full h-full object-cover ${isActive ? 'opacity-60' : ''}`} />
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {isDone && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
        )}
        {isFailed && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        )}
        {item.status === 'pending' && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">&times;</button>
        )}
      </div>
      <div className="px-2 py-1.5 bg-white">
        {isDone && item.result ? (
          <p className="text-xs font-medium text-slate-900 truncate">{item.result.itemName}</p>
        ) : isFailed ? (
          <>
            <p className="text-xs text-red-600 truncate">{item.error || 'Failed'}</p>
            <button onClick={(e) => { e.stopPropagation(); onRetry(); }} className="text-xs text-red-500 underline">Retry</button>
          </>
        ) : isActive ? (
          <p className="text-xs text-slate-500">{item.status === 'uploading' ? 'Uploading...' : 'Analyzing...'}</p>
        ) : (
          <p className="text-xs text-slate-400">Ready</p>
        )}
      </div>
    </div>
  );
}
