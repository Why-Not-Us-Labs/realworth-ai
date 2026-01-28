import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Super admin emails - always have Pro features
const SUPER_ADMIN_EMAILS = [
  'gavin@realworth.ai',
  'ann.mcnamara01@icloud.com',
];

/**
 * WNU Platform version: Check if user can create an appraisal
 * Uses subscriptions + token_balances tables instead of users table fields
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Verify user with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Use admin client for database operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get user email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', authUser.id)
      .single();

    if (userError || !user) {
      console.error('[CanCreate] Failed to fetch user:', userError);
      return NextResponse.json({ canCreate: false, remaining: 0, isPro: false, tokenBalance: 0 });
    }

    // Get subscription from WNU Platform subscriptions table
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('tier_id, status, iap_product_id, iap_expires_at')
      .eq('user_id', authUser.id)
      .single();

    // Get token balance from WNU Platform token_balances table
    const { data: tokenData } = await supabaseAdmin
      .from('token_balances')
      .select('balance')
      .eq('user_id', authUser.id)
      .single();

    const tokenBalance = tokenData?.balance || 0;

    // Check if Pro (super admin, Stripe Pro, or Apple IAP)
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email?.toLowerCase());
    const isStripePro = subscription?.tier_id === 'pro' && subscription?.status === 'active';
    const isIAPPro = subscription?.iap_product_id && subscription?.iap_expires_at &&
      new Date(subscription.iap_expires_at) > new Date();
    const isPro = isSuperAdmin || isStripePro || isIAPPro;

    // In WNU Platform, Pro users still need tokens to create appraisals
    // But they get monthly token grants automatically
    const canCreate = tokenBalance > 0;

    console.log('[CanCreate] Check result:', {
      userId: authUser.id,
      tokenBalance,
      isPro,
      canCreate,
    });

    return NextResponse.json({
      canCreate,
      remaining: tokenBalance,
      isPro,
      tokenBalance,
    });
  } catch (error) {
    console.error('[CanCreate] Error:', error);
    return NextResponse.json({ canCreate: false, remaining: 0, isPro: false, tokenBalance: 0 });
  }
}
