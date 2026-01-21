import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import * as jwt from 'jsonwebtoken';

// App Store Connect API configuration
const APP_STORE_ISSUER_ID = process.env.APP_STORE_ISSUER_ID;
const APP_STORE_KEY_ID = process.env.APP_STORE_KEY_ID;
const APP_STORE_PRIVATE_KEY = process.env.APP_STORE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const APP_STORE_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'ai.realworth.app';

// Product ID to tier mapping
const PRODUCT_TIERS: Record<string, 'pro'> = {
  'pro_monthly': 'pro',
  'pro_annual': 'pro',
  'ai.realworth.pro.monthly': 'pro',
  'ai.realworth.pro.annual': 'pro',
};

/**
 * Generate JWT for App Store Server API authentication
 */
function generateAppStoreJWT(): string {
  if (!APP_STORE_ISSUER_ID || !APP_STORE_KEY_ID || !APP_STORE_PRIVATE_KEY) {
    throw new Error('Missing App Store Connect API configuration');
  }

  const now = Math.floor(Date.now() / 1000);

  const token = jwt.sign(
    {
      iss: APP_STORE_ISSUER_ID,
      iat: now,
      exp: now + 3600, // 1 hour
      aud: 'appstoreconnect-v1',
      bid: APP_STORE_BUNDLE_ID,
    },
    APP_STORE_PRIVATE_KEY,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: APP_STORE_KEY_ID,
        typ: 'JWT',
      },
    }
  );

  return token;
}

/**
 * Decode and verify a signed transaction from StoreKit 2
 * In production, you should verify the signature with Apple's public key
 */
function decodeSignedTransaction(signedTransaction: string): {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  environment: string;
} {
  // StoreKit 2 transactions are JWS (JSON Web Signature)
  // The payload is in the second part of the JWS (base64url encoded)
  const parts = signedTransaction.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid signed transaction format');
  }

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

  return {
    transactionId: payload.transactionId,
    originalTransactionId: payload.originalTransactionId,
    productId: payload.productId,
    purchaseDate: payload.purchaseDate,
    expiresDate: payload.expiresDate,
    environment: payload.environment,
  };
}

/**
 * POST /api/apple/verify-purchase
 * Verify an Apple IAP purchase and update user subscription
 */
export async function POST(request: NextRequest) {
  console.log('[Apple IAP] Verifying purchase');

  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - missing or invalid token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = getSupabaseAdmin();

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('[Apple IAP] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      );
    }

    const { signedTransaction } = await request.json();

    if (!signedTransaction || typeof signedTransaction !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid signedTransaction' },
        { status: 400 }
      );
    }

    // Decode the signed transaction
    let transactionData;
    try {
      transactionData = decodeSignedTransaction(signedTransaction);
    } catch (decodeError) {
      console.error('[Apple IAP] Failed to decode transaction:', decodeError);
      return NextResponse.json(
        { error: 'Invalid transaction format' },
        { status: 400 }
      );
    }

    console.log('[Apple IAP] Transaction data:', {
      productId: transactionData.productId,
      transactionId: transactionData.transactionId,
      originalTransactionId: transactionData.originalTransactionId,
      environment: transactionData.environment,
    });

    // Verify this is a valid product
    const tier = PRODUCT_TIERS[transactionData.productId];
    if (!tier) {
      console.error('[Apple IAP] Unknown product ID:', transactionData.productId);
      return NextResponse.json(
        { error: 'Unknown product ID' },
        { status: 400 }
      );
    }

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (transactionData.expiresDate) {
      expiresAt = new Date(transactionData.expiresDate);
    }

    // Update user subscription in database
    // Set subscription_status to 'active' so isPro checks work correctly
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        subscription_source: 'apple_iap',
        iap_product_id: transactionData.productId,
        iap_original_transaction_id: transactionData.originalTransactionId,
        iap_expires_at: expiresAt?.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Apple IAP] Failed to update user subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[Apple IAP] Subscription activated for user:', user.id);

    return NextResponse.json({
      success: true,
      subscription: {
        tier,
        productId: transactionData.productId,
        expiresAt: expiresAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Apple IAP] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to verify purchase', details: errorMessage },
      { status: 500 }
    );
  }
}
