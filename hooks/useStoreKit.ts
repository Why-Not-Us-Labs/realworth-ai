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
 * Hook for interacting with StoreKit 2 via Capacitor
 * This communicates with native iOS code through a custom Capacitor plugin
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
        // Check if our StoreKit plugin is available
        const { Capacitor } = await import('@capacitor/core');
        const isNative = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform();

        if (isNative && platform === 'ios') {
          setState(prev => ({ ...prev, isAvailable: true, isLoading: false }));
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
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Call native StoreKit plugin to get products
      // This requires a custom Capacitor plugin that wraps StoreKit 2
      const StoreKit = await getStoreKitPlugin();
      if (!StoreKit) {
        throw new Error('StoreKit plugin not available');
      }

      const result = await StoreKit.getProducts({
        productIds: Object.values(STOREKIT_PRODUCTS),
      });

      const products: Product[] = result.products.map((p: {
        id: string;
        displayName: string;
        description: string;
        price: string;
        priceValue: number;
        currencyCode: string;
      }) => ({
        id: p.id,
        displayName: p.displayName,
        description: p.description,
        price: p.price,
        priceValue: p.priceValue,
        currencyCode: p.currencyCode,
      }));

      setState(prev => ({ ...prev, products, isLoading: false }));
    } catch (error) {
      console.error('[StoreKit] Error loading products:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load products',
      }));
    }
  }, []);

  // Purchase a product
  const purchase = useCallback(async (productId: ProductId): Promise<PurchaseResult> => {
    try {
      const StoreKit = await getStoreKitPlugin();
      if (!StoreKit) {
        throw new Error('StoreKit plugin not available');
      }

      // Initiate purchase through native StoreKit
      const result = await StoreKit.purchase({ productId });

      if (result.success && result.transaction) {
        // Verify the purchase with our backend
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }

        const verifyResponse = await fetch('/api/apple/verify-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            signedTransaction: result.transaction,
          }),
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          throw new Error(errorData.error || 'Failed to verify purchase');
        }

        // Finish the transaction in StoreKit
        if (result.transactionId) {
          await StoreKit.finishTransaction({ transactionId: result.transactionId });
        }

        return {
          success: true,
          transactionId: result.transactionId,
        };
      } else if (result.cancelled) {
        return {
          success: false,
          error: 'Purchase cancelled',
        };
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('[StoreKit] Purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }, []);

  // Restore previous purchases
  const restorePurchases = useCallback(async (): Promise<PurchaseResult> => {
    try {
      const StoreKit = await getStoreKitPlugin();
      if (!StoreKit) {
        throw new Error('StoreKit plugin not available');
      }

      const result = await StoreKit.restorePurchases();

      if (result.transactions && result.transactions.length > 0) {
        // Verify each restored transaction
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Not authenticated');
        }

        // Verify the most recent transaction
        const latestTransaction = result.transactions[0];

        const verifyResponse = await fetch('/api/apple/verify-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            signedTransaction: latestTransaction,
          }),
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          throw new Error(errorData.error || 'Failed to verify restored purchase');
        }

        return {
          success: true,
        };
      } else {
        return {
          success: false,
          error: 'No purchases to restore',
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

/**
 * Get the StoreKit Capacitor plugin
 * Returns null if not available
 */
async function getStoreKitPlugin(): Promise<StoreKitPlugin | null> {
  try {
    const { registerPlugin } = await import('@capacitor/core');
    const StoreKit = registerPlugin<StoreKitPlugin>('StoreKit');
    return StoreKit;
  } catch {
    return null;
  }
}

// Type definitions for the native StoreKit plugin
interface StoreKitPlugin {
  getProducts(options: { productIds: string[] }): Promise<{
    products: Array<{
      id: string;
      displayName: string;
      description: string;
      price: string;
      priceValue: number;
      currencyCode: string;
    }>;
  }>;
  purchase(options: { productId: string }): Promise<{
    success: boolean;
    cancelled?: boolean;
    transaction?: string;
    transactionId?: string;
    error?: string;
  }>;
  finishTransaction(options: { transactionId: string }): Promise<void>;
  restorePurchases(): Promise<{
    transactions: string[];
  }>;
}
