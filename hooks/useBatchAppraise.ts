'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { compressImage, uploadFile } from '@/lib/imageUtils';
import type { SneakerDetails, BuyOffer } from '@/lib/types';
import type { EbayMarketData } from '@/services/ebayPriceService';

export type BatchItemStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';

export type BatchItem = {
  id: string;
  photos: File[];
  thumbnail: string; // Object URL for preview
  status: BatchItemStatus;
  error?: string;
  result?: {
    appraisalId: string;
    itemName: string;
    sneakerDetails: SneakerDetails | null;
    buyOffer: BuyOffer | null;
    ebayMarketData: EbayMarketData | null;
    imageUrls: string[];
  };
};

type UseBatchAppraiseOptions = {
  partnerId?: string;
  storeLocation?: string;
  getAuthToken?: () => Promise<string | null>;
  pathPrefix?: string;
  maxConcurrent?: number;
};

export function useBatchAppraise(options: UseBatchAppraiseOptions = {}) {
  const {
    partnerId = 'bullseye',
    storeLocation,
    getAuthToken,
    pathPrefix = 'partner/bullseye/',
    maxConcurrent = 2,
  } = options;

  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef<Set<string>>(new Set());
  const itemsRef = useRef<BatchItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const addItems = useCallback((fileGroups: File[][]) => {
    const newItems: BatchItem[] = fileGroups.map((photos) => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      photos,
      thumbnail: URL.createObjectURL(photos[0]),
      status: 'pending' as const,
    }));

    setItems(prev => {
      const updated = [...prev, ...newItems];
      itemsRef.current = updated;
      return updated;
    });

    return newItems.map(i => i.id);
  }, []);

  const processItem = useCallback(async (item: BatchItem) => {
    // Mark as uploading
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, status: 'uploading' as const } : i
    ));

    try {
      // Compress and upload all photos for this item
      const urls: string[] = [];
      for (const photo of item.photos) {
        const compressed = await compressImage(photo);
        const url = await uploadFile(compressed, pathPrefix);
        if (url) urls.push(url);
      }

      if (urls.length === 0) {
        throw new Error('Failed to upload images');
      }

      // Mark as processing (AI analysis)
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'processing' as const } : i
      ));

      // Call appraise API
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (getAuthToken) {
        const token = await getAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }

      const body: Record<string, unknown> = {
        imageUrls: urls,
        imagePaths: [],
      };
      if (partnerId) body.partnerId = partnerId;
      if (storeLocation) body.storeLocation = storeLocation;

      const res = await fetch('/api/appraise', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Appraisal failed (${res.status})`);
      }

      const data = await res.json();

      setItems(prev => prev.map(i =>
        i.id === item.id ? {
          ...i,
          status: 'completed' as const,
          result: {
            appraisalId: data.appraisalId || '',
            itemName: data.appraisalData?.itemName || 'Unknown Item',
            sneakerDetails: data.sneakerDetails || null,
            buyOffer: data.buyOffer || null,
            ebayMarketData: data.ebayMarketData || null,
            imageUrls: urls,
          },
        } : i
      ));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'failed' as const, error: msg } : i
      ));
    }
  }, [partnerId, storeLocation, getAuthToken, pathPrefix]);

  const processNext = useCallback(async () => {
    if (processingRef.current.size >= maxConcurrent) return;

    const nextItem = itemsRef.current.find(
      i => i.status === 'pending' && !processingRef.current.has(i.id)
    );
    if (!nextItem) return;

    processingRef.current.add(nextItem.id);

    try {
      await processItem(nextItem);
    } finally {
      processingRef.current.delete(nextItem.id);
      // Try to process more
      const hasPending = itemsRef.current.some(i => i.status === 'pending');
      if (hasPending) {
        setTimeout(() => processNext(), 100);
      } else if (processingRef.current.size === 0) {
        setIsProcessing(false);
      }
    }
  }, [maxConcurrent, processItem]);

  const startProcessing = useCallback(() => {
    setIsProcessing(true);
    // Kick off up to maxConcurrent workers
    for (let i = 0; i < maxConcurrent; i++) {
      processNext();
    }
  }, [maxConcurrent, processNext]);

  const retryItem = useCallback((id: string) => {
    setItems(prev => {
      const updated = prev.map(i =>
        i.id === id ? { ...i, status: 'pending' as const, error: undefined } : i
      );
      itemsRef.current = updated;
      return updated;
    });
    // If processing is active, it will pick this up; otherwise start
    if (isProcessing) {
      setTimeout(() => processNext(), 0);
    }
  }, [isProcessing, processNext]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.thumbnail);
      const updated = prev.filter(i => i.id !== id);
      itemsRef.current = updated;
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    items.forEach(i => URL.revokeObjectURL(i.thumbnail));
    setItems([]);
    itemsRef.current = [];
    processingRef.current.clear();
    setIsProcessing(false);
  }, [items]);

  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    uploading: items.filter(i => i.status === 'uploading').length,
    processing: items.filter(i => i.status === 'processing').length,
    completed: items.filter(i => i.status === 'completed').length,
    failed: items.filter(i => i.status === 'failed').length,
    totalOfferAmount: items.reduce((sum, i) => sum + (i.result?.buyOffer?.amount || 0), 0),
  };

  return {
    items,
    stats,
    isProcessing,
    addItems,
    startProcessing,
    retryItem,
    removeItem,
    clearAll,
  };
}
