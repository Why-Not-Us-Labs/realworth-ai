import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { grantTokens, consumeTokens, getTokenBalance } from '@/services/tokenService';

/**
 * TEST ONLY - Manage user tokens for testing
 * This endpoint should be disabled in production
 *
 * POST /api/test/tokens
 * Body: {
 *   userId: string,
 *   action: 'grant' | 'consume' | 'set',
 *   amount?: number (for grant/set),
 *   reason?: string
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
      email, // Alternative to userId - lookup by email
      action,
      amount = 1,
      reason = 'Test token operation'
    } = body;

    let targetUserId = userId;

    // If email provided instead of userId, look up the user
    if (!targetUserId && email) {
      const supabaseAdmin = getSupabaseAdmin();
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

    if (!action || !['grant', 'consume', 'set'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be one of: grant, consume, set' },
        { status: 400 }
      );
    }

    let result;
    const supabaseAdmin = getSupabaseAdmin();

    switch (action) {
      case 'grant':
        result = await grantTokens(targetUserId, amount, 'admin', reason);
        if (!result.success) {
          return NextResponse.json(
            { error: 'Failed to grant tokens', details: result.error },
            { status: 500 }
          );
        }
        break;

      case 'consume':
        result = await consumeTokens(targetUserId, 'appraisal', undefined, { reason });
        if (!result.success) {
          return NextResponse.json(
            { error: 'Failed to consume token (may have insufficient balance)', details: result.error },
            { status: 400 }
          );
        }
        break;

      case 'set':
        // Directly set the balance (for testing)
        const { error: setError } = await supabaseAdmin
          .from('token_balances')
          .upsert({
            user_id: targetUserId,
            balance: amount,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (setError) {
          return NextResponse.json(
            { error: 'Failed to set token balance', details: setError.message },
            { status: 500 }
          );
        }

        // Log the set operation
        await supabaseAdmin
          .from('token_transactions')
          .insert({
            user_id: targetUserId,
            amount: amount,
            type: 'grant',
            reason: `[TEST] Set balance to ${amount}: ${reason}`,
            created_at: new Date().toISOString(),
          });

        result = { balance: amount };
        break;
    }

    // Get current balance
    const currentBalance = await getTokenBalance(targetUserId);

    return NextResponse.json({
      success: true,
      action,
      amount: action === 'consume' ? 1 : amount,
      currentBalance: currentBalance?.balance ?? 0,
      userId: targetUserId,
    });

  } catch (error) {
    console.error('[Test] Error managing tokens:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to manage tokens', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/tokens?userId=xxx or ?email=xxx
 * Get token balance and recent transactions
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

    // Get token balance
    const { data: balance, error: balanceError } = await supabaseAdmin
      .from('token_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get recent transactions
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('token_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      userId,
      balance: balance?.balance ?? 0,
      balanceRecord: balance || null,
      recentTransactions: transactions || [],
      errors: {
        balance: balanceError?.message,
        transactions: txError?.message,
      },
    });

  } catch (error) {
    console.error('[Test] Error getting token info:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get token info', details: errorMessage },
      { status: 500 }
    );
  }
}
