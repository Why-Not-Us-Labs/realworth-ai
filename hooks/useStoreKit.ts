'use client';

import { useState, useCallback, useEffect } from 'react';
import { isCapacitorApp } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Product IDs must match App Store Connect configuration
export const STOREKIT_PRODUCTS = {
  MONTHLY: 'ai.realworth.pro.monthly',
  ANNUAL: 'ai.realworth.pro.annual',
} as const;

type ProductId = typeof STOREKIT_PRODUCTS[keyof typeof STOREKIT_PRODUCTS];

interface Product {
  id: string;
  displayName: string;
  description: string;
  price: string;
  priceValue: number;
  currencyCode: string;
}

interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

interface StoreKitState {
  isAvailable: boolean;
  isLoading: boolean;
  products: Product[];
  error: string | null;
}

/**
 * Hook for interacting with StoreKit 2 via @capgo/native-purchases
 * This uses a battle-tested Capacitor plugin for iOS In-App Purchases
 */
export function useStoreKit() {
  const [state, setState] = useState<StoreKitState>({
    isAvailable: false,
    isLoading: true,
    products: [],
    error: null,
  });

  // Check if StoreKit is available (only in native iOS app)
  useEffect(() => {
    const checkAvailability = async () => {
      if (!isCapacitorApp()) {
        setState(prev => ({ ...prev, isAvailable: false, isLoading: false }));
        return;
      }

      try {
        const { Capacitor } = await import('@capacitor/core');
        const isNative = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform();

        if (isNative && platform === 'ios') {
          setState(prev => ({ ...prev, isAvailable: true }));
          // Load products after confirming availability
          loadProducts();
        } else {
          setState(prev => ({ ...prev, isAvailable: false, isLoading: false }));
        }
      } catch (error) {
        console.error('[StoreKit] Error checking availability:', error);
        setState(prev => ({ ...prev, isAvailable: false, isLoading: false }));
      }
    };

    checkAvailability();
  }, []);

  // Load available products from the App Store
  const loadProducts = useCallback(async () => {
    console.log('[StoreKit] Starting to load products via @capgo/native-purchases...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');

      const productIds = Object.values(STOREKIT_PRODUCTS);
      console.log('[StoreKit] Requesting products:', productIds);

      // 10-second timeout to account for network latency
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Product loading timed out')), 10000);
      });

      const result = await Promise.race([
        NativePurchases.getProducts({
          productIdentifiers: productIds,
          productType: PURCHASE_TYPE.SUBS,
        }),
        timeoutPromise,
      ]);

      console.log('[StoreKit] Got result:', JSON.stringify(result));

      if (!result.products || result.products.length === 0) {
        throw new Error('No products returned from App Store');
      }

      const products: Product[] = result.products.map((p) => ({
        id: p.identifier,
        displayName: p.title,
        description: p.description,
        price: p.priceString,
        priceValue: p.price,
        currencyCode: p.currencyCode,
      }));

      console.log('[StoreKit] Loaded products:', products.map(p => p.id).join(', '));
      setState(prev => ({ ...prev, products, isLoading: false }));
    } catch (error) {
      console.error('[StoreKit] Error loading products:', error);
      // On failure/timeout, disable StoreKit so we fall back to Stripe
      setState(prev => ({
        ...prev,
        isLoading: false,
        isAvailable: false,
        error: error instanceof Error ? error.message : 'Failed to load products',
      }));
    }
  }, []);

  // Purchase a product
  const purchase = useCallback(async (productId: ProductId): Promise<PurchaseResult> => {
    try {
      const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');

      console.log('[StoreKit] Starting purchase for:', productId);

      // Initiate purchase through native StoreKit
      const result = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: PURCHASE_TYPE.SUBS,
        quantity: 1,
      });

      console.log('[StoreKit] Purchase result:', JSON.stringify(result));

      if (result.transactionId) {
        // Verify the purchase with our backend
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }

        // The plugin provides the JWS signed transaction
        const verifyResponse = await fetch('/api/apple/verify-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            signedTransaction: result.jwsRepresentation,
          }),
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          throw new Error(errorData.error || 'Failed to verify purchase');
        }

        return {
          success: true,
          transactionId: result.transactionId,
        };
      } else {
        // Check if cancelled
        return {
          success: false,
          error: 'Purchase was cancelled or failed',
        };
      }
    } catch (error) {
      console.error('[StoreKit] Purchase error:', error);

      // Handle user cancellation
      const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
        return {
          success: false,
          error: 'Purchase cancelled',
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  // Restore previous purchases
  const restorePurchases = useCallback(async (): Promise<PurchaseResult> => {
    try {
      const { NativePurchases } = await import('@capgo/native-purchases');

      console.log('[StoreKit] Restoring purchases...');

      const result = await NativePurchases.restorePurchases();

      console.log('[StoreKit] Restore result:', JSON.stringify(result));

      // Check if we have any restored purchases
      // The plugin returns restored transaction info
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Call our backend to verify the restored subscription
      const verifyResponse = await fetch('/api/apple/verify-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          restore: true,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Failed to verify restored purchase');
      }

      const verifyData = await verifyResponse.json();

      if (verifyData.hasActiveSubscription) {
        return {
          success: true,
        };
      } else {
        return {
          success: false,
          error: 'No active subscriptions to restore',
        };
      }
    } catch (error) {
      console.error('[StoreKit] Restore error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      };
    }
  }, []);

  return {
    ...state,
    loadProducts,
    purchase,
    restorePurchases,
    PRODUCTS: STOREKIT_PRODUCTS,
  };
}
