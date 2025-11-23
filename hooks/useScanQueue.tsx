'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface QueuedItem {
  id: string;
  imageData: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: any;
  timestamp: number;
}

interface UseScanQueueOptions {
  onItemComplete?: (item: QueuedItem) => void;
  onItemError?: (item: QueuedItem, error: string) => void;
  maxConcurrent?: number;
}

export const useScanQueue = (options: UseScanQueueOptions = {}) => {
  const { onItemComplete, onItemError, maxConcurrent = 2 } = options;
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const processingRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<QueuedItem[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Process next item in queue
  const processNext = useCallback(async (processItem: (imageData: string) => Promise<any>) => {
    // Check if we can process more items
    if (processingRef.current.size >= maxConcurrent) {
      return;
    }

    // Find next pending item from ref (always current)
    const nextItem = queueRef.current.find(item => item.status === 'pending');
    if (!nextItem) {
      return;
    }

    // Mark as processing
    processingRef.current.add(nextItem.id);
    setQueue(prev => prev.map(item =>
      item.id === nextItem.id
        ? { ...item, status: 'processing' as const }
        : item
    ));

    try {
      // Process the item
      const result = await processItem(nextItem.imageData);

      // Mark as completed
      setQueue(prev => prev.map(item =>
        item.id === nextItem.id
          ? { ...item, status: 'completed' as const, result }
          : item
      ));

      processingRef.current.delete(nextItem.id);
      onItemComplete?.(nextItem);

      // Try to process next item if available
      const hasMorePending = queueRef.current.some(item => item.status === 'pending');
      if (hasMorePending && processingRef.current.size < maxConcurrent) {
        // Recursively process next
        setTimeout(() => processNext(processItem), 0);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error for debugging
      console.error(`Queue item ${nextItem.id} failed:`, error);
      
      // Mark as failed
      setQueue(prev => prev.map(item =>
        item.id === nextItem.id
          ? { ...item, status: 'failed' as const, error: errorMessage }
          : item
      ));

      processingRef.current.delete(nextItem.id);
      onItemError?.(nextItem, errorMessage);

      // Try to process next item if available (with small delay to prevent rapid retries)
      const hasMorePending = queueRef.current.some(item => item.status === 'pending');
      if (hasMorePending && processingRef.current.size < maxConcurrent) {
        // Recursively process next with small delay
        setTimeout(() => {
          try {
            processNext(processItem);
          } catch (err) {
            console.error('Error processing next queue item:', err);
          }
        }, 100);
      }
    }
  }, [maxConcurrent, onItemComplete, onItemError]);

  // Add item to queue
  const addToQueue = useCallback((imageData: string) => {
    const newItem: QueuedItem = {
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      imageData,
      status: 'pending',
      timestamp: Date.now(),
    };

    setQueue(prev => {
      const updated = [...prev, newItem];
      queueRef.current = updated;
      return updated;
    });
    return newItem.id;
  }, []);


  // Get queue stats
  const stats = {
    total: queue.length,
    pending: queue.filter(item => item.status === 'pending').length,
    processing: queue.filter(item => item.status === 'processing').length,
    completed: queue.filter(item => item.status === 'completed').length,
    failed: queue.filter(item => item.status === 'failed').length,
  };

  // Clear completed items
  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(item => item.status !== 'completed'));
  }, []);

  // Clear all items
  const clearAll = useCallback(() => {
    setQueue([]);
    processingRef.current.clear();
  }, []);

  // Remove specific item
  const removeItem = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
    processingRef.current.delete(id);
  }, []);

  return {
    queue,
    addToQueue,
    processNext,
    stats,
    clearCompleted,
    clearAll,
    removeItem,
  };
};

