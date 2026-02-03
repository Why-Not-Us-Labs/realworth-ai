import { getSupabaseAdmin } from '@/lib/supabase';

export interface TokenBalance {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  updatedAt: string;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  appId: string;
  amount: number;
  transactionType: 'consume' | 'grant';
  actionType: string;
  referenceId: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface ConsumeTokenResult {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
  balance?: number;
}

export interface GrantTokenResult {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}

const APP_ID = 'realworth';

/**
 * Get user's current token balance
 */
export async function getTokenBalance(userId: string): Promise<TokenBalance | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('token_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('[TokenService] Error fetching token balance:', error);
      return null;
    }

    return {
      userId: data.user_id,
      balance: data.balance,
      lifetimeEarned: data.lifetime_earned,
      lifetimeSpent: data.lifetime_spent,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('[TokenService] Error in getTokenBalance:', error);
    return null;
  }
}

/**
 * Consume tokens for an action
 * @param userId - User ID
 * @param actionType - Type of action: 'appraisal', 'enhanced_image', 'chat', 'list_item'
 * @param referenceId - Optional reference ID (e.g., appraisal ID)
 * @param metadata - Optional metadata
 */
export async function consumeTokens(
  userId: string,
  actionType: 'appraisal' | 'enhanced_image' | 'chat' | 'list_item',
  referenceId?: string,
  metadata?: Record<string, unknown>
): Promise<ConsumeTokenResult> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin.rpc('consume_tokens', {
      p_user_id: userId,
      p_app_id: APP_ID,
      p_action_type: actionType,
      p_reference_id: referenceId || null,
      p_metadata: metadata || {},
    });

    if (error) {
      console.error('[TokenService] RPC error consuming tokens:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      console.log('[TokenService] Token consumption failed:', data);
      return {
        success: false,
        error: data?.error || 'Unknown error',
        balance: data?.balance,
      };
    }

    console.log('[TokenService] Tokens consumed:', {
      userId,
      actionType,
      transactionId: data.transaction_id,
      newBalance: data.new_balance,
    });

    return {
      success: true,
      transactionId: data.transaction_id,
      newBalance: data.new_balance,
    };
  } catch (error) {
    console.error('[TokenService] Error in consumeTokens:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Grant tokens to a user (refunds, bonuses, subscription grants)
 * @param userId - User ID
 * @param amount - Number of tokens to grant
 * @param type - Type of grant: 'refund', 'bonus', 'admin', 'subscription_grant'
 * @param description - Description of the grant
 */
export async function grantTokens(
  userId: string,
  amount: number,
  type: 'refund' | 'bonus' | 'admin' | 'subscription_grant' | 'purchase',
  description: string
): Promise<GrantTokenResult> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin.rpc('grant_tokens', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_description: description,
      p_app_id: APP_ID,
    });

    if (error) {
      console.error('[TokenService] RPC error granting tokens:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      console.log('[TokenService] Token grant failed:', data);
      return {
        success: false,
        error: data?.error || 'Unknown error',
      };
    }

    console.log('[TokenService] Tokens granted:', {
      userId,
      amount,
      type,
      description,
      transactionId: data.transaction_id,
      newBalance: data.new_balance,
    });

    return {
      success: true,
      transactionId: data.transaction_id,
      newBalance: data.new_balance,
    };
  } catch (error) {
    console.error('[TokenService] Error in grantTokens:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Check if user has enough tokens for an action
 * Returns the current balance and whether they can perform the action
 */
export async function checkTokens(userId: string): Promise<{ hasTokens: boolean; balance: number }> {
  const tokenBalance = await getTokenBalance(userId);

  if (!tokenBalance) {
    return { hasTokens: false, balance: 0 };
  }

  return {
    hasTokens: tokenBalance.balance > 0,
    balance: tokenBalance.balance,
  };
}

/**
 * Get user's token transaction history
 */
export async function getTokenHistory(
  userId: string,
  limit: number = 50
): Promise<TokenTransaction[]> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('token_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[TokenService] Error fetching token history:', error);
      return [];
    }

    return (data || []).map((tx) => ({
      id: tx.id,
      userId: tx.user_id,
      appId: tx.app_id,
      amount: tx.amount,
      transactionType: tx.transaction_type,
      actionType: tx.action_type,
      referenceId: tx.reference_id,
      balanceAfter: tx.balance_after,
      createdAt: tx.created_at,
    }));
  } catch (error) {
    console.error('[TokenService] Error in getTokenHistory:', error);
    return [];
  }
}
