import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }

    // Get user's subscription info from subscriptions table (WNU Platform)
    const supabaseAdmin = getSupabaseAdmin();
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, cancel_at_period_end')
      .eq('user_id', userId)
      .single();

    if (fetchError || !subscription) {
      console.error('[Reactivate] Failed to fetch subscription:', fetchError);
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Subscription is not scheduled for cancellation' },
        { status: 400 }
      );
    }

    console.log('[Reactivate] Reactivating subscription for user:', userId);
    console.log('[Reactivate] Stripe subscription ID:', subscription.stripe_subscription_id);

    const stripe = getStripe();

    // First, check current Stripe state to handle edge cases
    const currentSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    // Cast to access raw response data
    const currentSubData = currentSubscription as unknown as { cancel_at_period_end: boolean; current_period_end: number };

    // If Stripe already shows as not canceling, just sync our DB and return success
    if (!currentSubData.cancel_at_period_end) {
      console.log('[Reactivate] Subscription already active in Stripe, syncing DB');

      const { error: syncError } = await supabaseAdmin
        .from('subscriptions')
        .update({ cancel_at_period_end: false })
        .eq('user_id', userId);

      if (syncError) {
        console.error('[Reactivate] Failed to sync DB:', syncError);
      }

      // Get period end timestamp - Stripe returns it as a Unix timestamp
      const periodEnd = currentSubData.current_period_end;
      const renewsAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

      return NextResponse.json({
        success: true,
        renewsAt,
        message: 'Subscription already active',
      });
    }

    // Reactivate by removing the cancel_at_period_end flag
    const reactivatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      { cancel_at_period_end: false }
    );
    // Cast to access raw response data
    const reactivatedSubData = reactivatedSubscription as unknown as { current_period_end: number; id: string; cancel_at_period_end: boolean };

    // Get period end timestamp - Stripe returns it as a Unix timestamp
    const periodEnd = reactivatedSubData.current_period_end;
    const renewsAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

    console.log('[Reactivate] Subscription reactivated:', {
      subscriptionId: reactivatedSubData.id,
      cancelAtPeriodEnd: reactivatedSubData.cancel_at_period_end,
      renewsAt,
    });

    // Update subscriptions table to reflect the reactivation (WNU Platform)
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ cancel_at_period_end: false })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Reactivate] Failed to update cancel_at_period_end in database:', updateError);
      // Don't fail the request - Stripe has already reactivated
    }

    return NextResponse.json({
      success: true,
      renewsAt,
    });
  } catch (error) {
    console.error('[Reactivate] Error reactivating subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to reactivate subscription', details: errorMessage },
      { status: 500 }
    );
  }
}
