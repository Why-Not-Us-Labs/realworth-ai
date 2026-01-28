import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FREE_APPRAISAL_LIMIT } from '@/lib/constants';

// Super admin emails - always have Pro features
const SUPER_ADMIN_EMAILS = [
  'gavin@realworth.ai',
  'ann.mcnamara01@icloud.com',
];

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

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, monthly_appraisal_count, appraisal_count_reset_at, subscription_tier, subscription_status, appraisal_credits')
      .eq('id', authUser.id)
      .single();

    if (userError || !user) {
      console.error('[CanCreate] Failed to fetch user:', userError);
      return NextResponse.json({ canCreate: false, remaining: 0, isPro: false, currentCount: 0, credits: 0, useCredit: false });
    }

    const credits = user.appraisal_credits || 0;

    // Super admin or Pro users have unlimited
    if (SUPER_ADMIN_EMAILS.includes(user.email?.toLowerCase()) ||
        (user.subscription_tier === 'pro' && user.subscription_status === 'active')) {
      return NextResponse.json({
        canCreate: true,
        remaining: Infinity,
        isPro: true,
        currentCount: user.monthly_appraisal_count || 0,
        credits,
        useCredit: false
      });
    }

    // Check if month reset is needed
    const now = new Date();
    const resetAt = user.appraisal_count_reset_at ? new Date(user.appraisal_count_reset_at) : null;

    // Reset only if: no reset date set OR we've passed the reset date
    const needsReset = !resetAt || now >= resetAt;

    let currentCount = user.monthly_appraisal_count || 0;

    if (needsReset) {
      // Reset count and set next reset date (first of next month)
      const firstOfNextMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1
      ));

      console.log('[CanCreate] Month reset triggered:', {
        userId: authUser.id,
        oldResetAt: resetAt?.toISOString() || 'null',
        newResetAt: firstOfNextMonth.toISOString(),
        oldCount: currentCount,
      });

      await supabaseAdmin
        .from('users')
        .update({
          monthly_appraisal_count: 0,
          appraisal_count_reset_at: firstOfNextMonth.toISOString()
        })
        .eq('id', authUser.id);

      currentCount = 0;
    }

    const freeRemaining = Math.max(0, FREE_APPRAISAL_LIMIT - currentCount);
    const hasFreeAppraisals = currentCount < FREE_APPRAISAL_LIMIT;
    const hasCredits = credits > 0;

    const canCreate = hasFreeAppraisals || hasCredits;
    const useCredit = !hasFreeAppraisals && hasCredits;

    console.log('[CanCreate] Check result:', {
      userId: authUser.id,
      currentCount,
      limit: FREE_APPRAISAL_LIMIT,
      freeRemaining,
      credits,
      canCreate,
      useCredit,
    });

    return NextResponse.json({
      canCreate,
      remaining: freeRemaining,
      isPro: false,
      currentCount,
      credits,
      useCredit,
    });
  } catch (error) {
    console.error('[CanCreate] Error:', error);
    return NextResponse.json({ canCreate: false, remaining: 0, isPro: false, currentCount: 0, credits: 0, useCredit: false });
  }
}
