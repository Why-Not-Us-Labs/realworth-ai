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
const APPRAISAL_PRICE_CENTS = 199; // $1.99
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://realworth.ai';

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

    // Create Checkout Session for $1.99 one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'RealWorth Appraisal Credit',
            description: 'Get 1 instant AI appraisal',
          },
          unit_amount: APPRAISAL_PRICE_CENTS,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${APP_URL}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}?purchase=canceled`,
      metadata: {
        user_id: user.id,
        type: 'pay_per_appraisal',
        credits: '1',
      },
    });

    console.log('[PayPerAppraisal] Checkout session created:', session.id);

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
