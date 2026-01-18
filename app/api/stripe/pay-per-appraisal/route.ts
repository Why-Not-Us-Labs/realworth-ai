import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Price in cents
const APPRAISAL_PRICE_CENTS = 299; // $2.99

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create authenticated client to verify the user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get user's Stripe customer ID or create one
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, email, name')
      .eq('id', user.id)
      .single();

    let stripeCustomerId = userData?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: userData?.email || user.email,
        name: userData?.name || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Save customer ID
      await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // Create PaymentIntent for $2.99
    const paymentIntent = await stripe.paymentIntents.create({
      amount: APPRAISAL_PRICE_CENTS,
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        user_id: user.id,
        type: 'pay_per_appraisal',
        credits: '1',
      },
      description: 'RealWorth.ai - Single Appraisal Credit',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: APPRAISAL_PRICE_CENTS,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

// Confirm payment and grant credit
export async function PUT(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID required' },
        { status: 400 }
      );
    }

    // Verify the payment was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed', status: paymentIntent.status },
        { status: 400 }
      );
    }

    const userId = paymentIntent.metadata.user_id;
    const credits = parseInt(paymentIntent.metadata.credits || '1', 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid payment metadata' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check if we already processed this payment (idempotency)
    const { data: existingPurchase } = await supabaseAdmin
      .from('appraisal_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (existingPurchase) {
      // Already processed - return current credit balance
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('appraisal_credits')
        .eq('id', userId)
        .single();

      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        credits: user?.appraisal_credits || 0,
      });
    }

    // Record the purchase
    const { error: purchaseError } = await supabaseAdmin
      .from('appraisal_purchases')
      .insert({
        user_id: userId,
        stripe_payment_intent_id: paymentIntentId,
        amount_cents: paymentIntent.amount,
        credits_granted: credits,
      });

    if (purchaseError) {
      console.error('Error recording purchase:', purchaseError);
      return NextResponse.json(
        { error: 'Failed to record purchase' },
        { status: 500 }
      );
    }

    // Add credits to user - simple atomic increment
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('appraisal_credits')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user credits:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch user credits' },
        { status: 500 }
      );
    }

    const newCredits = (currentUser?.appraisal_credits || 0) + credits;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ appraisal_credits: newCredits })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return NextResponse.json(
        { error: 'Failed to add credits' },
        { status: 500 }
      );
    }

    console.log('[PayPerAppraisal] Credits added:', { userId, credits, newCredits });

    return NextResponse.json({
      success: true,
      credits: newCredits,
      message: `Added ${credits} appraisal credit${credits > 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
