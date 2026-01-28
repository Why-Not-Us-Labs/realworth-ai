import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import { getTokenBalance } from './tokenService';

export type SubscriptionTier = 'free' | 'pro' | 'unlimited';
export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled';
export type SubscriptionSource = 'stripe' | 'apple_iap';

// Super admin emails - always have Pro features
const SUPER_ADMIN_EMAILS = [
  'gavin@realworth.ai',
  'ann.mcnamara01@icloud.com',
];

/**
 * WNU Platform subscription interface
 * Uses separate subscriptions table instead of fields on users table
 */
export interface UserSubscription {
  id: string;
  userId: string;
  tierId: SubscriptionTier;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  // Apple IAP fields (stored in subscriptions table)
  iapProductId: string | null;
  iapOriginalTransactionId: string | null;
  iapExpiresAt: string | null;
}

class SubscriptionService {
  /**
   * Check if email is super admin
   */
  isSuperAdmin(email: string): boolean {
    return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
  }

  /**
   * Get user's subscription data from WNU Platform subscriptions table
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      // Infer source from data: if iap_product_id exists, it's Apple IAP, otherwise Stripe
      const inferredSource: SubscriptionSource = data.iap_product_id ? 'apple_iap' : 'stripe';

      return {
        id: data.id,
        userId: data.user_id,
        tierId: (data.tier_id as SubscriptionTier) || 'free',
        status: (data.status as SubscriptionStatus) || 'active',
        source: inferredSource,
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        currentPeriodStart: data.current_period_start,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        iapProductId: data.iap_product_id || null,
        iapOriginalTransactionId: data.iap_original_transaction_id || null,
        iapExpiresAt: data.iap_expires_at || null,
      };
    } catch (error) {
      console.error('Error in getUserSubscription:', error);
      return null;
    }
  }

  /**
   * Check if user is Pro or Unlimited (by userId)
   * Supports both Stripe and Apple IAP subscriptions
   */
  async isPro(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);

    if (subscription) {
      const isPaidTier = subscription.tierId === 'pro' || subscription.tierId === 'unlimited';

      // Check Stripe subscription
      if (subscription.source === 'stripe' && isPaidTier && subscription.status === 'active') {
        return true;
      }

      // Check Apple IAP subscription
      if (subscription.source === 'apple_iap' && isPaidTier) {
        if (subscription.status === 'active') return true;
        // Fallback: check expiration date directly
        if (subscription.iapExpiresAt) {
          const expiresAt = new Date(subscription.iapExpiresAt);
          if (expiresAt > new Date()) return true;
        }
      }
    }

    // Check super admin by getting user email
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (user?.email && this.isSuperAdmin(user.email)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user is Pro or Unlimited (by email - faster for UI)
   * Supports both Stripe and Apple IAP subscriptions
   */
  isProByEmail(email: string, subscription: UserSubscription | null): boolean {
    if (this.isSuperAdmin(email)) return true;
    if (!subscription) return false;

    const isPaidTier = subscription.tierId === 'pro' || subscription.tierId === 'unlimited';
    if (!isPaidTier) return false;

    // Stripe subscription - check status
    if (subscription.source === 'stripe' && subscription.status === 'active') {
      return true;
    }

    // Apple IAP subscription - check status or expiration
    if (subscription.source === 'apple_iap') {
      if (subscription.status === 'active') return true;
      // Fallback: check expiration date directly
      if (subscription.iapExpiresAt) {
        const expiresAt = new Date(subscription.iapExpiresAt);
        if (expiresAt > new Date()) return true;
      }
    }

    return false;
  }

  /**
   * Update user's Stripe customer ID in subscriptions table
   */
  async updateStripeCustomerId(userId: string, customerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating Stripe customer ID:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in updateStripeCustomerId:', error);
      return false;
    }
  }

  /**
   * Activate Pro subscription after successful checkout
   * Uses admin client to bypass RLS (called from webhook)
   * @param fallbackUserId - Optional userId from checkout session metadata for fallback lookup
   */
  async activateProSubscription(
    stripeCustomerId: string,
    subscriptionId: string,
    expiresAt: Date,
    fallbackUserId?: string
  ): Promise<boolean> {
    try {
      console.log('[SubscriptionService] activateProSubscription called:', {
        stripeCustomerId,
        subscriptionId,
        expiresAt: expiresAt.toISOString(),
        fallbackUserId: fallbackUserId || 'none',
      });

      const supabaseAdmin = getSupabaseAdmin();

      // First try to find subscription by stripe_customer_id
      let { data: existingSubscription, error: fetchError } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, tier_id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      // Fallback: try lookup by userId from checkout metadata
      if ((fetchError || !existingSubscription) && fallbackUserId) {
        console.log('[SubscriptionService] Primary lookup failed, trying fallback by userId:', fallbackUserId);

        const { data: subById, error: subByIdError } = await supabaseAdmin
          .from('subscriptions')
          .select('id, user_id, tier_id')
          .eq('user_id', fallbackUserId)
          .single();

        if (subById && !subByIdError) {
          console.log('[SubscriptionService] Found subscription by fallbackUserId, updating stripe_customer_id');

          // Update stripe_customer_id for future lookups
          await supabaseAdmin
            .from('subscriptions')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('user_id', fallbackUserId);

          existingSubscription = subById;
          fetchError = null;
        }
      }

      if (fetchError || !existingSubscription) {
        console.error('[SubscriptionService] Subscription not found by stripe_customer_id or fallbackUserId:', {
          stripeCustomerId,
          fallbackUserId,
          error: fetchError,
        });
        return false;
      }

      console.log('[SubscriptionService] Found subscription:', {
        id: existingSubscription.id,
        userId: existingSubscription.user_id,
        currentTier: existingSubscription.tier_id,
      });

      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          tier_id: 'pro',
          stripe_subscription_id: subscriptionId,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: expiresAt.toISOString(),
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id)
        .select();

      if (error) {
        console.error('[SubscriptionService] Error activating Pro subscription:', error);
        return false;
      }

      console.log('[SubscriptionService] Update result:', data);
      return true;
    } catch (error) {
      console.error('[SubscriptionService] Error in activateProSubscription:', error);
      return false;
    }
  }

  /**
   * Activate Apple IAP subscription
   * Used by verify-purchase endpoint
   */
  async activateIAPSubscription(
    userId: string,
    productId: string,
    originalTransactionId: string,
    expiresAt: Date
  ): Promise<boolean> {
    try {
      console.log('[SubscriptionService] activateIAPSubscription called:', {
        userId,
        productId,
        originalTransactionId,
        expiresAt: expiresAt.toISOString(),
      });

      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          tier_id: 'pro',
          status: 'active',
          iap_product_id: productId,
          iap_original_transaction_id: originalTransactionId,
          iap_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('[SubscriptionService] Error activating IAP subscription:', error);
        return false;
      }

      console.log('[SubscriptionService] IAP subscription activated for user:', userId);
      return true;
    } catch (error) {
      console.error('[SubscriptionService] Error in activateIAPSubscription:', error);
      return false;
    }
  }

  /**
   * Update subscription status
   * Uses admin client to bypass RLS (called from webhook)
   */
  async updateSubscriptionStatus(
    stripeCustomerId: string,
    status: SubscriptionStatus,
    expiresAt?: Date,
    cancelAtPeriodEnd?: boolean
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {
        status: status,
        updated_at: new Date().toISOString(),
      };

      if (expiresAt) {
        updateData.current_period_end = expiresAt.toISOString();
      }

      if (cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = cancelAtPeriodEnd;
      }

      // If canceled, downgrade tier
      if (status === 'canceled') {
        updateData.tier_id = 'free';
        updateData.stripe_subscription_id = null;
        updateData.cancel_at_period_end = false;
      }

      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update(updateData)
        .eq('stripe_customer_id', stripeCustomerId);

      if (error) {
        console.error('Error updating subscription status:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in updateSubscriptionStatus:', error);
      return false;
    }
  }

  /**
   * Check if user can create an appraisal (token-based)
   * In WNU Platform, this checks token balance instead of monthly counts
   */
  async canCreateAppraisal(userId: string): Promise<{ canCreate: boolean; remaining: number; isPro: boolean; tokenBalance: number }> {
    try {
      // Check if user is Pro (Pro/Unlimited users can still run out of tokens)
      const isPro = await this.isPro(userId);

      // Get token balance
      const tokenBalance = await getTokenBalance(userId);

      if (!tokenBalance) {
        console.error('[SubscriptionService] Failed to fetch token balance for user:', userId);
        return { canCreate: false, remaining: 0, isPro, tokenBalance: 0 };
      }

      const balance = tokenBalance.balance;
      const canCreate = balance > 0;

      console.log('[SubscriptionService] canCreateAppraisal check:', {
        userId,
        tokenBalance: balance,
        canCreate,
        isPro
      });

      return {
        canCreate,
        remaining: balance,
        isPro,
        tokenBalance: balance,
      };
    } catch (error) {
      console.error('[SubscriptionService] Error in canCreateAppraisal:', error);
      return { canCreate: false, remaining: 0, isPro: false, tokenBalance: 0 };
    }
  }

  /**
   * Get user by Stripe customer ID from subscriptions table
   */
  async getUserByStripeCustomerId(customerId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (error || !data) {
        return null;
      }
      return data.user_id;
    } catch (error) {
      console.error('Error in getUserByStripeCustomerId:', error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();
