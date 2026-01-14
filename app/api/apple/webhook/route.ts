import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Apple notification types
type NotificationType =
  | 'SUBSCRIBED'
  | 'DID_RENEW'
  | 'DID_CHANGE_RENEWAL_STATUS'
  | 'DID_CHANGE_RENEWAL_PREF'
  | 'OFFER_REDEEMED'
  | 'EXPIRED'
  | 'DID_FAIL_TO_RENEW'
  | 'GRACE_PERIOD_EXPIRED'
  | 'REFUND'
  | 'REFUND_DECLINED'
  | 'CONSUMPTION_REQUEST'
  | 'REVOKE'
  | 'TEST';

type NotificationSubtype =
  | 'INITIAL_BUY'
  | 'RESUBSCRIBE'
  | 'DOWNGRADE'
  | 'UPGRADE'
  | 'AUTO_RENEW_ENABLED'
  | 'AUTO_RENEW_DISABLED'
  | 'VOLUNTARY'
  | 'BILLING_RETRY'
  | 'PRICE_INCREASE'
  | 'GRACE_PERIOD'
  | 'BILLING_RECOVERY'
  | 'PENDING'
  | 'ACCEPTED';

interface DecodedPayload {
  notificationType: NotificationType;
  subtype?: NotificationSubtype;
  data: {
    signedTransactionInfo: string;
    signedRenewalInfo?: string;
  };
  notificationUUID: string;
  signedDate: number;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Decode a signed payload from Apple (JWS format)
 */
function decodeSignedPayload<T>(signedPayload: string): T {
  const parts = signedPayload.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid signed payload format');
  }

  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

/**
 * POST /api/apple/webhook
 * Handle App Store Server Notifications (version 2)
 */
export async function POST(request: NextRequest) {
  console.log('[Apple Webhook] Received notification');

  try {
    const body = await request.json();
    const { signedPayload } = body;

    if (!signedPayload) {
      console.error('[Apple Webhook] Missing signedPayload');
      return NextResponse.json({ error: 'Missing signedPayload' }, { status: 400 });
    }

    // Decode the notification payload
    const payload = decodeSignedPayload<DecodedPayload>(signedPayload);

    console.log('[Apple Webhook] Notification type:', payload.notificationType, payload.subtype || '');

    // Decode the transaction info
    const transactionInfo = decodeSignedPayload<{
      transactionId: string;
      originalTransactionId: string;
      productId: string;
      purchaseDate: number;
      expiresDate?: number;
      environment: string;
    }>(payload.data.signedTransactionInfo);

    console.log('[Apple Webhook] Transaction:', {
      originalTransactionId: transactionInfo.originalTransactionId,
      productId: transactionInfo.productId,
      type: payload.notificationType,
    });

    const supabaseAdmin = getSupabaseAdmin();

    // Find the user by original transaction ID
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, subscription_tier')
      .eq('iap_original_transaction_id', transactionInfo.originalTransactionId)
      .single();

    if (userError || !userData) {
      console.log('[Apple Webhook] User not found for transaction:', transactionInfo.originalTransactionId);
      // Return 200 to acknowledge receipt - Apple will retry otherwise
      return NextResponse.json({ received: true, processed: false, reason: 'user_not_found' });
    }

    // Handle different notification types
    switch (payload.notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
      case 'OFFER_REDEEMED': {
        // Subscription is active - update expiration
        const expiresAt = transactionInfo.expiresDate
          ? new Date(transactionInfo.expiresDate).toISOString()
          : null;

        await supabaseAdmin
          .from('users')
          .update({
            subscription_tier: 'pro',
            subscription_status: 'active',
            subscription_source: 'apple_iap',
            iap_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userData.id);

        console.log('[Apple Webhook] Subscription renewed for user:', userData.id);
        break;
      }

      case 'EXPIRED':
      case 'GRACE_PERIOD_EXPIRED': {
        // Subscription has expired - downgrade to free
        await supabaseAdmin
          .from('users')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            iap_expires_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userData.id);

        console.log('[Apple Webhook] Subscription expired for user:', userData.id);
        break;
      }

      case 'REFUND':
      case 'REVOKE': {
        // Subscription refunded/revoked - immediately downgrade
        await supabaseAdmin
          .from('users')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            iap_expires_at: new Date().toISOString(),
            iap_original_transaction_id: null, // Clear transaction ID on revoke
            updated_at: new Date().toISOString(),
          })
          .eq('id', userData.id);

        console.log('[Apple Webhook] Subscription revoked for user:', userData.id);
        break;
      }

      case 'DID_CHANGE_RENEWAL_STATUS': {
        // User enabled/disabled auto-renewal
        // We don't need to change tier, just log it
        console.log('[Apple Webhook] Renewal status changed:', payload.subtype);
        break;
      }

      case 'DID_CHANGE_RENEWAL_PREF': {
        // User changed subscription plan (upgrade/downgrade)
        // This takes effect at next renewal, no immediate action needed
        console.log('[Apple Webhook] Renewal preference changed:', payload.subtype);
        break;
      }

      case 'DID_FAIL_TO_RENEW': {
        // Billing failed - subscription enters grace period or billing retry
        if (payload.subtype === 'GRACE_PERIOD') {
          // In grace period - keep subscription active
          console.log('[Apple Webhook] User in grace period:', userData.id);
        } else {
          // Billing retry - subscription still active but at risk
          console.log('[Apple Webhook] Billing retry for user:', userData.id);
        }
        break;
      }

      case 'TEST': {
        console.log('[Apple Webhook] Test notification received');
        break;
      }

      default: {
        console.log('[Apple Webhook] Unhandled notification type:', payload.notificationType);
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error('[Apple Webhook] Error processing notification:', error);
    // Return 200 anyway to prevent Apple from retrying
    // Log the error for investigation
    return NextResponse.json({ received: true, processed: false, error: 'internal_error' });
  }
}
