import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Valid access codes - MUST be set in environment, no defaults in production
const VALID_ACCESS_CODES = process.env.ACCESS_CODES
  ? process.env.ACCESS_CODES.split(',').map(c => c.trim().toUpperCase())
  : [];

// Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify the user is authenticated and matches the userId
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

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(authToken);

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const { code, userId } = await request.json();

    if (!code || !userId) {
      return NextResponse.json(
        { error: 'Missing code or userId' },
        { status: 400 }
      );
    }

    // SECURITY: Ensure the authenticated user matches the requested userId
    if (authUser.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User mismatch' },
        { status: 403 }
      );
    }

    // Check if access codes are configured
    if (VALID_ACCESS_CODES.length === 0) {
      return NextResponse.json(
        { error: 'Access codes are not currently available' },
        { status: 503 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Validate the code
    if (!VALID_ACCESS_CODES.includes(normalizedCode)) {
      return NextResponse.json(
        { error: 'Invalid access code. Check your spelling and try again.' },
        { status: 400 }
      );
    }

    // Check if user already has Pro or has already redeemed a code
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('subscription_tier, subscription_status, access_code_used')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already Pro via Stripe
    if (user.subscription_tier === 'pro' && user.subscription_status === 'active' && !user.access_code_used) {
      return NextResponse.json(
        { error: 'You already have an active Pro subscription!' },
        { status: 400 }
      );
    }

    // Check if already redeemed a code
    if (user.access_code_used) {
      return NextResponse.json(
        { error: `You've already redeemed an access code: ${user.access_code_used}` },
        { status: 400 }
      );
    }

    // Redeem the code - grant Pro access
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_tier: 'pro',
        subscription_status: 'active',
        access_code_used: normalizedCode,
        access_code_redeemed_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error redeeming access code:', updateError);
      return NextResponse.json(
        { error: 'Failed to redeem access code. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: getSuccessMessage(normalizedCode),
      code: normalizedCode,
    });

  } catch (error) {
    console.error('Access code error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

function getSuccessMessage(code: string): string {
  const messages: Record<string, string> = {
    'XMARKSTHESPOT': 'Ahoy! You found the treasure! Pro features unlocked.',
    'HIDDENGEM': 'You discovered a hidden gem! Pro features unlocked.',
    'GOLDKEY2025': 'The golden key worked! Pro features unlocked.',
  };
  return messages[code] || 'Access code accepted! Pro features unlocked.';
}
