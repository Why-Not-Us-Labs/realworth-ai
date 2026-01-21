import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { subscriptionService } from '@/services/subscriptionService';
import { getSupabaseAdmin } from '@/lib/supabase';

// Disable body parsing for webhook route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY!;
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body - critical for signature verification
    // Use arrayBuffer to get the exact raw bytes, then convert to string
    const arrayBuffer = await request.arrayBuffer();
    const body = Buffer.from(arrayBuffer).toString('utf8');
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Webhook] No stripe-signature header found');
      return NextResponse.json(
        { error: 'No signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const trimmedSecret = webhookSecret.trim();
    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature!, trimmedSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Webhook] Signature verification failed:', errorMessage);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle one-time payment (pay-per-appraisal)
        if (session.mode === 'payment' && session.metadata?.type === 'pay_per_appraisal') {
          const userId = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits || '1', 10);

          if (!userId) {
            console.error('[Webhook] pay_per_appraisal: No user_id in metadata');
            return NextResponse.json({ error: 'No user ID in session metadata' }, { status: 500 });
          }

          try {
            const supabaseAdmin = getSupabaseAdmin();

            // Check if we already processed this session (idempotency)
            const { data: existingPurchase } = await supabaseAdmin
              .from('appraisal_purchases')
              .select('id')
              .eq('stripe_payment_intent_id', session.id)
              .single();

            if (existingPurchase) {
              console.log('[Webhook] pay_per_appraisal: Session already processed:', session.id);
              break;
            }

            // Record the purchase
            const { error: purchaseError } = await supabaseAdmin
              .from('appraisal_purchases')
              .insert({
                user_id: userId,
                stripe_payment_intent_id: session.id,
                amount_cents: session.amount_total || 199,
                credits_granted: credits,
              });

            if (purchaseError) {
              console.error('[Webhook] pay_per_appraisal: Error recording purchase:', purchaseError);
              return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
            }

            // Add credits to user
            const { data: currentUser, error: fetchError } = await supabaseAdmin
              .from('users')
              .select('appraisal_credits')
              .eq('id', userId)
              .single();

            if (fetchError) {
              console.error('[Webhook] pay_per_appraisal: Error fetching user:', fetchError);
              return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
            }

            const newCredits = (currentUser?.appraisal_credits || 0) + credits;

            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({ appraisal_credits: newCredits })
              .eq('id', userId);

            if (updateError) {
              console.error('[Webhook] pay_per_appraisal: Error updating credits:', updateError);
              return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
            }

            console.log('[Webhook] pay_per_appraisal: Added', credits, 'credits for user:', userId);
          } catch (payError) {
            console.error('[Webhook] pay_per_appraisal: Error:', payError);
            return NextResponse.json({ error: 'Pay per appraisal handler error' }, { status: 500 });
          }
          break;
        }

        const userId = session.metadata?.userId;

        // Handle both string and object cases for customer/subscription
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : (session.customer as any)?.id;

        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as any)?.id;

        if (!customerId) {
          console.error('[Webhook] NO CUSTOMER ID! Cannot process.');
          return NextResponse.json({ error: 'No customer ID in session' }, { status: 500 });
        }

        if (!subscriptionId) {
          console.error('[Webhook] NO SUBSCRIPTION ID! Session mode:', session.mode, 'This breaks the flow!');
          return NextResponse.json({ error: 'No subscription ID in session' }, { status: 500 });
        }

        try {
          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price']
          });
          const subResponse = subscriptionResponse as any;
          let periodEnd = subResponse.current_period_end;
          let items = subResponse.items?.data || [];
          let created = subResponse.created;

          // Fallback: If current_period_end is missing, calculate from created date + interval
          if (!periodEnd || typeof periodEnd !== 'number') {
            const interval = items[0]?.price?.recurring?.interval || 'month';
            const intervalCount = items[0]?.price?.recurring?.interval_count || 1;

            if (created && typeof created === 'number') {
              const createdDate = new Date(created * 1000);
              const expiresDate = new Date(createdDate);

              if (interval === 'month') {
                expiresDate.setMonth(expiresDate.getMonth() + intervalCount);
              } else if (interval === 'year') {
                expiresDate.setFullYear(expiresDate.getFullYear() + intervalCount);
              } else if (interval === 'day') {
                expiresDate.setDate(expiresDate.getDate() + intervalCount);
              } else {
                expiresDate.setDate(expiresDate.getDate() + 30);
              }

              periodEnd = Math.floor(expiresDate.getTime() / 1000);
            } else {
              // Final fallback: 30 days from now
              periodEnd = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
            }
          }

          const expiresAt = new Date(periodEnd * 1000);

          if (isNaN(expiresAt.getTime())) {
            console.error('[Webhook] checkout.session.completed: Invalid expiration date');
            return NextResponse.json({ error: 'Invalid expiration date' }, { status: 500 });
          }

          const success = await subscriptionService.activateProSubscription(
            customerId,
            subscriptionId,
            expiresAt,
            userId
          );

          if (!success) {
            console.error('[Webhook] Failed to activate subscription for customer:', customerId);
            return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 });
          }
        } catch (subError) {
          console.error('[Webhook] Error in checkout.session.completed handler:', subError);
          return NextResponse.json({ error: 'Checkout handler error' }, { status: 500 });
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;

        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as any)?.id;
        const subscriptionId = subscription.id;

        if (subscription.status !== 'active') {
          break;
        }

        try {
          const stripe = getStripe();
          const subData = subscription as any;
          let periodEnd = subData.current_period_end || subData.currentPeriodEnd;
          let items = subData.items?.data || [];
          let created = subData.created;

          // Try to retrieve full subscription from API for accurate data
          // Fall back to event payload if subscription doesn't exist
          try {
            const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ['items.data.price']
            });
            const fullSubData = fullSubscription as any;
            periodEnd = fullSubData.current_period_end || fullSubData.currentPeriodEnd || periodEnd;
            // Use API data if available, otherwise fall back to event payload
            if (fullSubData.items?.data && fullSubData.items.data.length > 0) {
              items = fullSubData.items.data;
            }
            if (fullSubData.created) {
              created = fullSubData.created;
            }
          } catch (retrieveError: any) {
            if (retrieveError?.code === 'resource_missing') {
              // Use data from event payload
            } else {
              throw retrieveError;
            }
          }

          // Fallback: If current_period_end is missing, calculate from created date + interval
          if (!periodEnd || typeof periodEnd !== 'number') {
            const interval = items[0]?.price?.recurring?.interval || 'month';
            const intervalCount = items[0]?.price?.recurring?.interval_count || 1;

            if (created && typeof created === 'number') {
              const createdDate = new Date(created * 1000);
              const expiresDate = new Date(createdDate);

              if (interval === 'month') {
                expiresDate.setMonth(expiresDate.getMonth() + intervalCount);
              } else if (interval === 'year') {
                expiresDate.setFullYear(expiresDate.getFullYear() + intervalCount);
              } else if (interval === 'day') {
                expiresDate.setDate(expiresDate.getDate() + intervalCount);
              } else {
                expiresDate.setDate(expiresDate.getDate() + 30);
              }

              periodEnd = Math.floor(expiresDate.getTime() / 1000);
            } else {
              // Final fallback: 30 days from now
              periodEnd = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
            }
          }

          const expiresAt = new Date(periodEnd * 1000);

          if (isNaN(expiresAt.getTime())) {
            console.error('[Webhook] customer.subscription.created: Invalid date');
            return NextResponse.json({ error: 'Invalid expiration date' }, { status: 500 });
          }

          const success = await subscriptionService.activateProSubscription(
            customerId,
            subscriptionId,
            expiresAt
            // No fallbackUserId available in this event - metadata not accessible
          );

          if (!success) {
            console.error('[Webhook] subscription.created: Failed to activate for customer:', customerId);
            return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 });
          }
        } catch (subError) {
          console.error('[Webhook] customer.subscription.created: Error:', subError);
          return NextResponse.json({ error: 'Subscription created handler error' }, { status: 500 });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle both string and object cases for customer
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as any)?.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subObj = subscription as any;
        const periodEnd = subObj.current_period_end || subObj.currentPeriodEnd;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;

        // Validate period_end before creating date
        let expiresAt: Date | undefined;
        if (periodEnd && typeof periodEnd === 'number') {
          expiresAt = new Date(periodEnd * 1000);
          if (isNaN(expiresAt.getTime())) {
            console.error('[Webhook] customer.subscription.updated: Invalid date from:', periodEnd);
            expiresAt = undefined;
          }
        }

        if (!customerId) {
          console.error('[Webhook] customer.subscription.updated: No customer ID');
          break;
        }


        let status: 'active' | 'past_due' | 'canceled' = 'active';
        if (subscription.status === 'past_due') {
          status = 'past_due';
        } else if (subscription.status === 'canceled') {
          // Only mark as canceled if Stripe says it's actually canceled
          status = 'canceled';
        } else if (cancelAtPeriodEnd) {
          // User scheduled cancellation but still has active access until period end
          // Keep status as 'active' - they still have Pro until expiration
          status = 'active';
        }

        const success = await subscriptionService.updateSubscriptionStatus(customerId, status, expiresAt, cancelAtPeriodEnd);
        if (!success) {
          console.error('[Webhook] subscription.updated: Failed for customer:', customerId);
          return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle both string and object cases for customer
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as any)?.id;

        if (!customerId) {
          console.error('[Webhook] customer.subscription.deleted: No customer ID');
          break;
        }

        const success = await subscriptionService.updateSubscriptionStatus(customerId, 'canceled');
        if (!success) {
          console.error('[Webhook] subscription.deleted: Failed for customer:', customerId);
          return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle both string and object cases for customer
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as any)?.id;

        if (!customerId) {
          console.error('[Webhook] invoice.payment_failed: No customer ID');
          break;
        }

        const success = await subscriptionService.updateSubscriptionStatus(customerId, 'past_due');
        if (!success) {
          console.error('[Webhook] payment_failed: Failed for customer:', customerId);
          return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
        }
        break;
      }

      // Handle successful payments (renewals update expiration date)
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle both string and object cases for customer
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as any)?.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceData = invoice as any;
        const subscriptionId = invoiceData.subscription;

        if (!customerId) {
          console.error('[Webhook] invoice.payment_succeeded: No customer ID');
          break;
        }

        // For subscription renewals, update the expiration date
        if (subscriptionId && invoiceData.billing_reason === 'subscription_cycle') {
          try {
            const stripe = getStripe();
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const subData = subscription as any;
            const periodEnd = subData.current_period_end || subData.currentPeriodEnd;

            if (periodEnd && typeof periodEnd === 'number') {
              const expiresAt = new Date(periodEnd * 1000);
              if (!isNaN(expiresAt.getTime())) {
                const success = await subscriptionService.updateSubscriptionStatus(customerId, 'active', expiresAt);
                if (!success) {
                  console.error(`[Webhook] invoice.payment_succeeded: Failed to update renewal for customer ${customerId}`);
                }
              } else {
                console.error('[Webhook] invoice.payment_succeeded: Invalid date');
              }
            } else {
              console.error('[Webhook] invoice.payment_succeeded: Invalid period_end');
            }
          } catch (subError) {
            console.error('[Webhook] invoice.payment_succeeded: Error:', subError);
          }
        }
        break;
      }

      // Handle subscription paused (optional feature)
      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle both string and object cases for customer
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as any)?.id;

        if (!customerId) {
          console.error('[Webhook] customer.subscription.paused: No customer ID');
          break;
        }

        const success = await subscriptionService.updateSubscriptionStatus(customerId, 'inactive');
        if (!success) {
          console.error('[Webhook] subscription.paused: Failed for customer:', customerId);
          return NextResponse.json({ error: 'Failed to pause subscription' }, { status: 500 });
        }
        break;
      }

      // Handle subscription resumed (optional feature)
      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle both string and object cases for customer
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as any)?.id;
        const subscriptionId = subscription.id;

        if (!customerId) {
          console.error('[Webhook] customer.subscription.resumed: No customer ID');
          break;
        }

        try {
          const stripe = getStripe();
          const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          const subData = fullSubscription as any;
          let periodEnd = subData.current_period_end || subData.currentPeriodEnd;

          // Fallback: If current_period_end is missing, calculate from created date + interval
          if (!periodEnd || typeof periodEnd !== 'number') {
            const created = subData.created;
            const items = subData.items?.data || [];
            const interval = items[0]?.price?.recurring?.interval || 'month';
            const intervalCount = items[0]?.price?.recurring?.interval_count || 1;

            if (created && typeof created === 'number') {
              const createdDate = new Date(created * 1000);
              const expiresDate = new Date(createdDate);

              if (interval === 'month') {
                expiresDate.setMonth(expiresDate.getMonth() + intervalCount);
              } else if (interval === 'year') {
                expiresDate.setFullYear(expiresDate.getFullYear() + intervalCount);
              } else if (interval === 'day') {
                expiresDate.setDate(expiresDate.getDate() + intervalCount);
              } else {
                expiresDate.setDate(expiresDate.getDate() + 30);
              }

              periodEnd = Math.floor(expiresDate.getTime() / 1000);
            } else {
              periodEnd = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
            }
          }

          const expiresAt = new Date(periodEnd * 1000);

          if (isNaN(expiresAt.getTime())) {
            console.error('[Webhook] customer.subscription.resumed: Invalid date');
            break;
          }

          const success = await subscriptionService.updateSubscriptionStatus(customerId, 'active', expiresAt);
          if (!success) {
            console.error('[Webhook] subscription.resumed: Failed for customer:', customerId);
            return NextResponse.json({ error: 'Failed to resume subscription' }, { status: 500 });
          }
        } catch (subError) {
          console.error('[Webhook] subscription.resumed: Error:', subError);
          return NextResponse.json({ error: 'Failed to resume subscription' }, { status: 500 });
        }
        break;
      }

      default:
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
