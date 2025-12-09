'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface QueueItem {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: {
    itemName: string;
    priceRange: { low: number; high: number };
    currency: string;
  } | null;
  appraisal_id: string | null;
  error_message: string | null;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

interface NewlyCompletedItem {
  id: string;
  appraisalId: string | null;
  itemName: string;
  value: number;
  currency: string;
}

interface UseQueueOptions {
  userId?: string | null;
  onItemComplete?: (item: NewlyCompletedItem) => void;
  pollInterval?: number; // ms
}

export function useQueue({ userId, onItemComplete, pollInterval = 3000 }: UseQueueOptions) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });
  const [isPolling, setIsPolling] = useState(false);
  const lastCompletedRef = useRef<Set<string>>(new Set());

  // Fetch queue status
  const fetchStatus = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/queue/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      setItems(data.items || []);
      setStats(data.stats || { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 });

      // Check for newly completed items
      if (data.newlyCompleted && onItemComplete) {
        for (const item of data.newlyCompleted) {
          if (!lastCompletedRef.current.has(item.id)) {
            lastCompletedRef.current.add(item.id);
            onItemComplete(item);
          }
        }
      }
    } catch (error) {
      console.error('[useQueue] Fetch error:', error);
    }
  }, [userId, onItemComplete]);

  // Add item to queue
  const addToQueue = useCallback(async (imageUrls: string[], condition: string = 'Good') => {
    if (!userId) {
      throw new Error('User must be logged in');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No valid session');
    }

    const response = await fetch('/api/queue/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ imageUrls, condition }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add to queue');
    }

    const result = await response.json();

    // Immediately update local state
    setStats(prev => ({
      ...prev,
      pending: prev.pending + 1,
      total: prev.total + 1,
    }));

    // Start polling if not already
    setIsPolling(true);

    // Fetch fresh status
    await fetchStatus();

    return result;
  }, [userId, fetchStatus]);

  // Clear completed items from view
  const clearCompleted = useCallback(() => {
    setItems(prev => prev.filter(item => item.status !== 'completed' && item.status !== 'failed'));
    setStats(prev => ({
      ...prev,
      completed: 0,
      failed: 0,
      total: prev.pending + prev.processing,
    }));
  }, []);

  // Polling effect
  useEffect(() => {
    if (!userId || !isPolling) return;

    // Initial fetch
    fetchStatus();

    // Set up polling interval
    const interval = setInterval(() => {
      fetchStatus();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [userId, isPolling, pollInterval, fetchStatus]);

  // Start/stop polling based on active items
  useEffect(() => {
    const hasActiveItems = stats.pending > 0 || stats.processing > 0;
    if (hasActiveItems && !isPolling) {
      setIsPolling(true);
    } else if (!hasActiveItems && isPolling && stats.total > 0) {
      // Keep polling for a bit after completion to catch any stragglers
      const timeout = setTimeout(() => {
        setIsPolling(false);
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [stats, isPolling]);

  return {
    items,
    stats,
    addToQueue,
    clearCompleted,
    refreshStatus: fetchStatus,
    isPolling,
    hasActiveItems: stats.pending > 0 || stats.processing > 0,
  };
}

export default useQueue;
