import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { subscriptionService } from '@/services/subscriptionService';

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

    // Get user's subscription info
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    console.log('[Cancel] Canceling subscription for user:', userId);
    console.log('[Cancel] Stripe subscription ID:', subscription.stripeSubscriptionId);

    // Cancel at period end (user keeps access until billing cycle ends)
    const stripe = getStripe();
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subData = canceledSubscription as any;
    const periodEnd = subData.current_period_end || subData.currentPeriodEnd;
    const cancelAt = new Date(periodEnd * 1000).toISOString();

    console.log('[Cancel] Subscription scheduled for cancellation:', {
      subscriptionId: canceledSubscription.id,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      currentPeriodEnd: cancelAt,
    });

    return NextResponse.json({
      success: true,
      cancelAt,
    });
  } catch (error) {
    console.error('[Cancel] Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
