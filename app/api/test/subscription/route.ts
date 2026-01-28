import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { subscriptionService } from '@/services/subscriptionService';

/**
 * TEST ONLY - Manage user subscription for testing
 * This endpoint should be disabled in production
 *
 * POST /api/test/subscription
 * Body: {
 *   userId?: string,
 *   email?: string,
 *   tier: 'free' | 'pro' | 'unlimited',
 *   status?: 'active' | 'inactive' | 'canceled' | 'past_due',
 *   source?: 'stripe' | 'apple_iap'
 * }
 */
export async function POST(request: NextRequest) {
  // Safety check - only allow in development
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_ENDPOINTS) {
    return NextResponse.json(
      { error: 'Test endpoints are disabled in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      userId,
      email,
      tier,
      status = 'active',
      source = 'stripe',
    } = body;

    let targetUserId = userId;
    const supabaseAdmin = getSupabaseAdmin();

    // If email provided instead of userId, look up the user
    if (!targetUserId && email) {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (error || !user) {
        return NextResponse.json(
          { error: 'User not found by email' },
          { status: 404 }
        );
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'userId or email is required' },
        { status: 400 }
      );
    }

    if (!tier || !['free', 'pro', 'unlimited'].includes(tier)) {
      return NextResponse.json(
        { error: 'tier must be one of: free, pro, unlimited' },
        { status: 400 }
      );
    }

    // Calculate period dates for testing
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month from now

    // Build update data based on source
    const updateData: Record<string, unknown> = {
      tier_id: tier,
      status: tier === 'free' ? 'inactive' : status,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      updated_at: now.toISOString(),
    };

    // Clear/set source-specific fields
    if (source === 'stripe') {
      updateData.stripe_subscription_id = tier !== 'free' ? `test_sub_${Date.now()}` : null;
      updateData.stripe_customer_id = `test_cus_${targetUserId.substring(0, 8)}`;
      updateData.iap_product_id = null;
      updateData.iap_original_transaction_id = null;
      updateData.iap_expires_at = null;
    } else if (source === 'apple_iap') {
      updateData.iap_product_id = tier !== 'free' ? `com.realworth.${tier}` : null;
      updateData.iap_original_transaction_id = tier !== 'free' ? `test_tx_${Date.now()}` : null;
      updateData.iap_expires_at = tier !== 'free' ? periodEnd.toISOString() : null;
    }

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: targetUserId,
        ...updateData,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[Test] Subscription update error:', error);
      return NextResponse.json(
        { error: 'Failed to update subscription', details: error.message },
        { status: 500 }
      );
    }

    // Verify the change
    const isPro = await subscriptionService.isPro(targetUserId);

    return NextResponse.json({
      success: true,
      message: `Subscription updated to ${tier}`,
      subscription: data,
      isPro,
      userId: targetUserId,
    });

  } catch (error) {
    console.error('[Test] Error updating subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update subscription', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/subscription?userId=xxx or ?email=xxx
 * Get subscription status and check isPro
 */
export async function GET(request: NextRequest) {
  // Safety check - only allow in development
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_ENDPOINTS) {
    return NextResponse.json(
      { error: 'Test endpoints are disabled in production' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    const email = searchParams.get('email');

    const supabaseAdmin = getSupabaseAdmin();

    // If email provided instead of userId, look up the user
    if (!userId && email) {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (error || !user) {
        return NextResponse.json(
          { error: 'User not found by email' },
          { status: 404 }
        );
      }
      userId = user.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId or email query parameter is required' },
        { status: 400 }
      );
    }

    // Get subscription from service (proper mapping)
    const subscription = await subscriptionService.getUserSubscription(userId);

    // Check isPro
    const isPro = await subscriptionService.isPro(userId);

    // Check canAppraise
    const canAppraise = await subscriptionService.canCreateAppraisal(userId);

    // Get user email to check super admin
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    const isSuperAdmin = user?.email
      ? subscriptionService.isSuperAdmin(user.email)
      : false;

    return NextResponse.json({
      userId,
      email: user?.email,
      subscription,
      isPro,
      isSuperAdmin,
      canAppraise,
    });

  } catch (error) {
    console.error('[Test] Error getting subscription info:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get subscription info', details: errorMessage },
      { status: 500 }
    );
  }
}
