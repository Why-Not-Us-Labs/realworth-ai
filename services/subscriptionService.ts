import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import { FREE_APPRAISAL_LIMIT } from '@/lib/constants';

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled';

// Re-export for convenience
export { FREE_APPRAISAL_LIMIT };

// Super admin emails - always have Pro features
const SUPER_ADMIN_EMAILS = [
  'gavin@realworth.ai',
  'ann.mcnamara01@icloud.com',
];

export type SubscriptionSource = 'stripe' | 'apple_iap';

export interface UserSubscription {
  subscriptionTier: SubscriptionTier;
  subscriptionSource: SubscriptionSource;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  monthlyAppraisalCount: number;
  appraisalCountResetAt: string | null;
  accessCodeUsed: string | null;
  // IAP-specific fields
  iapProductId: string | null;
  iapOriginalTransactionId: string | null;
  iapExpiresAt: string | null;
  // Pay-as-you-go credits
  appraisalCredits: number;
}

class SubscriptionService {
  /**
   * Check if email is super admin
   */
  isSuperAdmin(email: string): boolean {
    return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
  }

  /**
   * Get user's subscription data
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          subscription_tier,
          subscription_source,
          stripe_customer_id,
          stripe_subscription_id,
          subscription_status,
          subscription_expires_at,
          cancel_at_period_end,
          monthly_appraisal_count,
          appraisal_count_reset_at,
          access_code_used,
          iap_product_id,
          iap_original_transaction_id,
          iap_expires_at,
          appraisal_credits
        `)
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return {
        subscriptionTier: (data.subscription_tier as SubscriptionTier) || 'free',
        subscriptionSource: (data.subscription_source as SubscriptionSource) || 'stripe',
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        subscriptionStatus: (data.subscription_status as SubscriptionStatus) || 'inactive',
        subscriptionExpiresAt: data.subscription_expires_at,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        monthlyAppraisalCount: data.monthly_appraisal_count || 0,
        appraisalCountResetAt: data.appraisal_count_reset_at,
        accessCodeUsed: data.access_code_used || null,
        iapProductId: data.iap_product_id || null,
        iapOriginalTransactionId: data.iap_original_transaction_id || null,
        iapExpiresAt: data.iap_expires_at || null,
        appraisalCredits: data.appraisal_credits || 0,
      };
    } catch (error) {
      console.error('Error in getUserSubscription:', error);
      return null;
    }
  }

  /**
   * Check if user is Pro (by userId)
   * Supports both Stripe and Apple IAP subscriptions
   */
  async isPro(userId: string): Promise<boolean> {
    // Check subscription
    const subscription = await this.getUserSubscription(userId);

    if (subscription) {
      // Check Stripe subscription
      if (
        subscription.subscriptionSource === 'stripe' &&
        subscription.subscriptionTier === 'pro' &&
        subscription.subscriptionStatus === 'active'
      ) {
        return true;
      }

      // Check Apple IAP subscription
      if (
        subscription.subscriptionSource === 'apple_iap' &&
        subscription.subscriptionTier === 'pro' &&
        subscription.iapExpiresAt
      ) {
        const expiresAt = new Date(subscription.iapExpiresAt);
        if (expiresAt > new Date()) {
          return true;
        }
      }

      // Check if Pro via access code (no expiration for access codes)
      if (subscription.subscriptionTier === 'pro' && subscription.accessCodeUsed) {
        return true;
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
   * Check if user is Pro (by email - faster for UI)
   * Supports both Stripe and Apple IAP subscriptions
   */
  isProByEmail(email: string, subscription: UserSubscription | null): boolean {
    if (this.isSuperAdmin(email)) return true;
    if (!subscription || subscription.subscriptionTier !== 'pro') return false;

    // Stripe subscription - check status
    if (subscription.subscriptionSource === 'stripe' && subscription.subscriptionStatus === 'active') {
      return true;
    }

    // Apple IAP subscription - check status (set by verify-purchase) or expiration
    if (subscription.subscriptionSource === 'apple_iap') {
      if (subscription.subscriptionStatus === 'active') return true;
      // Fallback: check expiration date directly
      if (subscription.iapExpiresAt) {
        const expiresAt = new Date(subscription.iapExpiresAt);
        if (expiresAt > new Date()) return true;
      }
    }

    // Access code grants - no expiration
    if (subscription.accessCodeUsed) return true;

    return false;
  }

  /**
   * Update user's Stripe customer ID
   */
  async updateStripeCustomerId(userId: string, customerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);

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

      // First try to find user by stripe_customer_id
      let { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id, email, subscription_tier')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      // Fallback: try lookup by userId from checkout metadata
      if ((fetchError || !existingUser) && fallbackUserId) {
        console.log('[SubscriptionService] Primary lookup failed, trying fallback by userId:', fallbackUserId);

        const { data: userById, error: userByIdError } = await supabaseAdmin
          .from('users')
          .select('id, email, subscription_tier')
          .eq('id', fallbackUserId)
          .single();

        if (userById && !userByIdError) {
          console.log('[SubscriptionService] Found user by fallbackUserId, updating stripe_customer_id');

          // Update stripe_customer_id for future lookups
          await supabaseAdmin
            .from('users')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('id', fallbackUserId);

          existingUser = userById;
          fetchError = null;
        }
      }

      if (fetchError || !existingUser) {
        console.error('[SubscriptionService] User not found by stripe_customer_id or fallbackUserId:', {
          stripeCustomerId,
          fallbackUserId,
          error: fetchError,
        });
        return false;
      }

      console.log('[SubscriptionService] Found user:', {
        id: existingUser.id,
        email: existingUser.email,
        currentTier: existingUser.subscription_tier,
      });

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          subscription_tier: 'pro',
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
          cancel_at_period_end: false, // Reset on new/renewed subscription
        })
        .eq('stripe_customer_id', stripeCustomerId)
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
        subscription_status: status,
      };

      if (expiresAt) {
        updateData.subscription_expires_at = expiresAt.toISOString();
      }

      // Track cancellation schedule
      if (cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = cancelAtPeriodEnd;
      }

      // If canceled or past_due, downgrade tier
      if (status === 'canceled') {
        updateData.subscription_tier = 'free';
        updateData.stripe_subscription_id = null;
        updateData.cancel_at_period_end = false;
      }

      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from('users')
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
   * Increment monthly appraisal count for free tier tracking
   * Uses admin client to bypass RLS - ensures count is always updated
   */
  async incrementAppraisalCount(userId: string): Promise<{ count: number; limitReached: boolean }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Check if Pro or super admin (no counting needed)
      const isPro = await this.isPro(userId);
      if (isPro) {
        return { count: 0, limitReached: false };
      }

      // Get current state - month reset already handled by canCreateAppraisal()
      // but we call ensureMonthReset() for safety in case called independently
      const { currentCount } = await this.ensureMonthReset(userId);

      // Increment count
      const newCount = currentCount + 1;
      const limitReached = newCount >= FREE_APPRAISAL_LIMIT;

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ monthly_appraisal_count: newCount })
        .eq('id', userId);

      if (updateError) {
        console.error('[SubscriptionService] CRITICAL: Failed to increment appraisal count:', updateError);
        return { count: currentCount, limitReached: currentCount >= FREE_APPRAISAL_LIMIT };
      }

      console.log('[SubscriptionService] Incremented appraisal count:', { userId, newCount, limitReached, limit: FREE_APPRAISAL_LIMIT });
      return { count: newCount, limitReached };
    } catch (error) {
      console.error('[SubscriptionService] Error in incrementAppraisalCount:', error);
      return { count: 0, limitReached: false };
    }
  }

  /**
   * Check if user can create an appraisal
   * Uses admin client for reliable reads
   * Now includes pay-as-you-go credits check
   */
  async canCreateAppraisal(userId: string): Promise<{
    canCreate: boolean;
    remaining: number;
    isPro: boolean;
    currentCount: number;
    credits: number;
    useCredit: boolean;
  }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('email, monthly_appraisal_count, appraisal_count_reset_at, subscription_tier, subscription_status, appraisal_credits')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('[SubscriptionService] Failed to fetch user for canCreateAppraisal:', error);
        return { canCreate: false, remaining: 0, isPro: false, currentCount: 0, credits: 0, useCredit: false };
      }

      const credits = user.appraisal_credits || 0;

      // Super admin or Pro users have unlimited
      if (this.isSuperAdmin(user.email) || (user.subscription_tier === 'pro' && user.subscription_status === 'active')) {
        return { canCreate: true, remaining: Infinity, isPro: true, currentCount: user.monthly_appraisal_count || 0, credits, useCredit: false };
      }

      // Ensure month is properly reset (uses single source of truth)
      const { currentCount } = await this.ensureMonthReset(userId);

      const freeRemaining = Math.max(0, FREE_APPRAISAL_LIMIT - currentCount);
      const hasFreeAppraisals = currentCount < FREE_APPRAISAL_LIMIT;
      const hasCredits = credits > 0;

      // Can create if: has free appraisals remaining OR has credits
      const canCreate = hasFreeAppraisals || hasCredits;
      // Will use credit only if no free appraisals left but has credits
      const useCredit = !hasFreeAppraisals && hasCredits;

      console.log('[SubscriptionService] canCreateAppraisal check:', {
        userId,
        currentCount,
        limit: FREE_APPRAISAL_LIMIT,
        freeRemaining,
        credits,
        canCreate,
        useCredit,
      });

      return {
        canCreate,
        remaining: freeRemaining,
        isPro: false,
        currentCount,
        credits,
        useCredit,
      };
    } catch (error) {
      console.error('[SubscriptionService] Error in canCreateAppraisal:', error);
      return { canCreate: false, remaining: 0, isPro: false, currentCount: 0, credits: 0, useCredit: false };
    }
  }

  /**
   * Consume one appraisal credit (for pay-as-you-go)
   * Returns true if credit was consumed, false if no credits available
   */
  async consumeCredit(userId: string): Promise<{ consumed: boolean; remaining: number }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Get current credits
      const { data: user, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('appraisal_credits')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        console.error('[SubscriptionService] Failed to fetch credits:', fetchError);
        return { consumed: false, remaining: 0 };
      }

      const currentCredits = user.appraisal_credits || 0;

      if (currentCredits <= 0) {
        console.log('[SubscriptionService] No credits to consume for user:', userId);
        return { consumed: false, remaining: 0 };
      }

      // Decrement credit
      const newCredits = currentCredits - 1;
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ appraisal_credits: newCredits })
        .eq('id', userId);

      if (updateError) {
        console.error('[SubscriptionService] Failed to consume credit:', updateError);
        return { consumed: false, remaining: currentCredits };
      }

      console.log('[SubscriptionService] Credit consumed:', { userId, newCredits });
      return { consumed: true, remaining: newCredits };
    } catch (error) {
      console.error('[SubscriptionService] Error in consumeCredit:', error);
      return { consumed: false, remaining: 0 };
    }
  }

  /**
   * Get user's current credit balance
   */
  async getCreditBalance(userId: string): Promise<number> {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('appraisal_credits')
        .eq('id', userId)
        .single();

      if (error || !data) return 0;
      return data.appraisal_credits || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Ensure month reset is properly handled (Single Source of Truth)
   * This method checks if a new month has started and resets the counter if needed.
   * ALWAYS persists to database to avoid inconsistencies.
   */
  private async ensureMonthReset(userId: string): Promise<{
    currentCount: number;
    resetAt: Date;
  }> {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('monthly_appraisal_count, appraisal_count_reset_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('[SubscriptionService] ensureMonthReset - failed to fetch user:', error);
      // Return safe defaults
      const nextMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1));
      return { currentCount: 0, resetAt: nextMonth };
    }

    const now = new Date();
    const resetAt = user.appraisal_count_reset_at
      ? new Date(user.appraisal_count_reset_at)
      : null;

    // Check if reset needed (different month or never set)
    // Use UTC to avoid timezone issues
    const needsReset = !resetAt ||
      now.getUTCMonth() !== resetAt.getUTCMonth() ||
      now.getUTCFullYear() !== resetAt.getUTCFullYear();

    if (needsReset) {
      // Reset and persist to DB
      const firstOfNextMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1
      ));

      console.log('[SubscriptionService] Month reset triggered:', {
        userId,
        oldResetAt: resetAt?.toISOString() || 'null',
        newResetAt: firstOfNextMonth.toISOString(),
        oldCount: user.monthly_appraisal_count || 0,
      });

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          monthly_appraisal_count: 0,
          appraisal_count_reset_at: firstOfNextMonth.toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[SubscriptionService] Failed to persist month reset:', updateError);
      }

      return { currentCount: 0, resetAt: firstOfNextMonth };
    }

    return {
      currentCount: user.monthly_appraisal_count || 0,
      resetAt: resetAt!
    };
  }

  /**
   * Get user by Stripe customer ID
   */
  async getUserByStripeCustomerId(customerId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (error || !data) {
        return null;
      }
      return data.id;
    } catch (error) {
      console.error('Error in getUserByStripeCustomerId:', error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();
