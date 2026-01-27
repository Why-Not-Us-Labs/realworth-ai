import { useState, useEffect, useCallback, useRef } from 'react';
import { subscriptionService, UserSubscription } from '@/services/subscriptionService';
import { getTokenBalance, TokenBalance } from '@/services/tokenService';
import { supabase } from '@/lib/supabase';

export function useSubscription(userId: string | null, userEmail?: string | null) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track previous subscription status for change detection
  const prevStatusRef = useRef<string | null>(null);

  const loadSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setTokenBalance(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load subscription and token balance in parallel
      const [subData, balanceData] = await Promise.all([
        subscriptionService.getUserSubscription(userId),
        getTokenBalance(userId),
      ]);

      setSubscription(subData);
      setTokenBalance(balanceData);

      // Log if subscription status changed (for debugging)
      if (prevStatusRef.current !== null && prevStatusRef.current !== subData?.status) {
        console.log(`[Subscription] Status changed: ${prevStatusRef.current} → ${subData?.status}`);
      }
      prevStatusRef.current = subData?.status || null;
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // ==========================================================================
  // LAYER 1: Supabase Realtime Subscription (WNU Platform)
  // Listen for changes to the subscriptions table in real-time
  // ==========================================================================
  useEffect(() => {
    if (!userId) return;

    console.log('[Subscription] Setting up Realtime listener for user:', userId);

    const channel = supabase
      .channel(`user-subscription-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newData = payload.new as Record<string, unknown>;
          console.log('[Subscription] Realtime update received:', {
            tier_id: newData.tier_id,
            status: newData.status,
          });

          // Refresh subscription data when subscription record changes
          loadSubscription();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'token_balances',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newData = payload.new as Record<string, unknown>;
          console.log('[Subscription] Token balance update received:', {
            balance: newData.balance,
          });

          // Refresh to get updated token balance
          loadSubscription();
        }
      )
      .subscribe((status) => {
        console.log('[Subscription] Realtime channel status:', status);
      });

    return () => {
      console.log('[Subscription] Cleaning up Realtime listener');
      supabase.removeChannel(channel);
    };
  }, [userId, loadSubscription]);

  // ==========================================================================
  // LAYER 2: Polling Fallback
  // Poll every 30 seconds when the page is visible (backup for Realtime)
  // ==========================================================================
  useEffect(() => {
    if (!userId) return;

    const POLL_INTERVAL = 30000; // 30 seconds

    const pollSubscription = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Subscription] Polling refresh...');
        loadSubscription();
      }
    };

    const interval = setInterval(pollSubscription, POLL_INTERVAL);

    // Also refresh when page becomes visible again (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Subscription] Page visible, refreshing...');
        loadSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, loadSubscription]);

  // ==========================================================================
  // LAYER 3: Post-Checkout Verification
  // Poll rapidly after checkout until subscription is confirmed active
  // ==========================================================================
  const verifySubscriptionActive = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setIsVerifying(true);
    console.log('[Subscription] Starting post-checkout verification...');

    const MAX_ATTEMPTS = 10;
    const POLL_INTERVAL = 2000; // 2 seconds

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`[Subscription] Verification attempt ${attempt}/${MAX_ATTEMPTS}`);

      try {
        const data = await subscriptionService.getUserSubscription(userId);

        const isPaidTier = data?.tierId === 'pro' || data?.tierId === 'unlimited';
        if (data?.status === 'active' && isPaidTier) {
          console.log('[Subscription] Verified active!');
          setSubscription(data);
          prevStatusRef.current = data.status;
          setIsVerifying(false);
          return true;
        }

        // Wait before next attempt (except on last attempt)
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
      } catch (err) {
        console.error('[Subscription] Verification error:', err);
      }
    }

    console.error('[Subscription] Verification timed out after 10 attempts');
    setIsVerifying(false);

    // Final refresh to get latest state
    await loadSubscription();
    return false;
  }, [userId, loadSubscription]);

  const checkCanAppraise = useCallback(async () => {
    if (!userId) return { canCreate: false, remaining: 0, isPro: false, tokenBalance: 0 };
    return subscriptionService.canCreateAppraisal(userId);
  }, [userId]);

  // Deprecated: incrementUsage no longer needed with token system
  const incrementUsage = useCallback(async () => {
    console.warn('incrementUsage: Deprecated in WNU Platform (token system)');
    return { count: 0, limitReached: false };
  }, []);

  const openPortal = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening portal:', err);
    }
  }, [userId]);

  const cancelSubscription = useCallback(async (): Promise<{ success: boolean; cancelAt?: string; error?: string }> => {
    if (!userId) return { success: false, error: 'Not logged in' };

    try {
      const response = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to cancel' };
      }

      // Refresh subscription data after cancellation
      await loadSubscription();

      return { success: true, cancelAt: data.cancelAt };
    } catch (err) {
      console.error('Error canceling subscription:', err);
      return { success: false, error: 'Network error' };
    }
  }, [userId, loadSubscription]);

  const reactivateSubscription = useCallback(async (): Promise<{ success: boolean; renewsAt?: string; error?: string }> => {
    if (!userId) return { success: false, error: 'Not logged in' };

    try {
      const response = await fetch('/api/stripe/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to reactivate' };
      }

      // Refresh subscription data after reactivation
      await loadSubscription();

      return { success: true, renewsAt: data.renewsAt };
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      return { success: false, error: 'Network error' };
    }
  }, [userId, loadSubscription]);

  // Check if Pro (including super admin and Apple IAP) - WNU Platform schema
  const isPro = userEmail
    ? subscriptionService.isProByEmail(userEmail, subscription)
    : subscriptionService.isProByEmail('', subscription);

  return {
    subscription,
    tokenBalance,
    isLoading,
    isVerifying,
    error,
    isPro,
    isSuperAdmin: userEmail ? subscriptionService.isSuperAdmin(userEmail) : false,
    usageCount: tokenBalance?.balance || 0, // Now returns token balance
    checkCanAppraise,
    incrementUsage,
    openPortal,
    cancelSubscription,
    reactivateSubscription,
    refresh: loadSubscription,
    verifySubscriptionActive,
  };
}
