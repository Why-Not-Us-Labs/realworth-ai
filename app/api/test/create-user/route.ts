import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * TEST ONLY - Create a test user with subscription and tokens
 * This endpoint should be disabled in production
 *
 * POST /api/test/create-user
 * Body: {
 *   email: string,
 *   name?: string,
 *   tier?: 'free' | 'pro' | 'unlimited',
 *   tokens?: number
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
      email,
      name = 'Test User',
      tier = 'free',
      tokens = 10
    } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm for testing
      user_metadata: {
        name,
        full_name: name,
      },
    });

    if (authError) {
      // If user already exists, try to get them
      if (authError.message.includes('already been registered')) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users.find(u => u.email === email);

        if (existingUser) {
          return NextResponse.json({
            message: 'User already exists',
            userId: existingUser.id,
            email: existingUser.email,
          });
        }
      }

      console.error('[Test] Auth error:', authError);
      return NextResponse.json(
        { error: 'Failed to create auth user', details: authError.message },
        { status: 500 }
      );
    }

    const userId = authData.user.id;
    console.log('[Test] Created auth user:', userId);

    // Step 2: Create user profile in users table
    // The trigger should handle this, but let's ensure it exists
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('[Test] Profile error:', profileError);
      // Don't fail - the trigger might have created it
    }

    // Step 3: Create subscription record
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        tier_id: tier,
        status: tier === 'free' ? 'inactive' : 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error('[Test] Subscription error:', subError);
      return NextResponse.json(
        { error: 'Failed to create subscription', details: subError.message },
        { status: 500 }
      );
    }

    // Step 4: Create token balance
    const { error: tokenError } = await supabaseAdmin
      .from('token_balances')
      .upsert({
        user_id: userId,
        balance: tokens,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (tokenError) {
      console.error('[Test] Token balance error:', tokenError);
      return NextResponse.json(
        { error: 'Failed to create token balance', details: tokenError.message },
        { status: 500 }
      );
    }

    // Step 5: Add initial token transaction
    const { error: txError } = await supabaseAdmin
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount: tokens,
        type: 'grant',
        reason: 'Test user initial tokens',
        created_at: new Date().toISOString(),
      });

    if (txError) {
      console.error('[Test] Token transaction error:', txError);
      // Non-blocking - balance was created
    }

    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      user: {
        id: userId,
        email,
        name,
        tier,
        tokens,
      },
    });

  } catch (error) {
    console.error('[Test] Error creating test user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create test user', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/create-user?email=xxx&action=create|info
 *
 * With action=create (or no action): Creates a new test user
 *   ?email=test@example.com
 *   ?email=test@example.com&name=John&tier=pro&tokens=20
 *
 * With action=info: Get existing user info
 *   ?email=test@example.com&action=info
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
    const email = searchParams.get('email');
    const action = searchParams.get('action') || 'create';
    const name = searchParams.get('name') || 'Test User';
    const tier = (searchParams.get('tier') as 'free' | 'pro' | 'unlimited') || 'free';
    const tokens = parseInt(searchParams.get('tokens') || '10', 10);

    if (!email) {
      return NextResponse.json(
        { error: 'Email query parameter is required. Usage: ?email=test@example.com&tier=pro&tokens=10' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // If action=create, create the user
    if (action === 'create') {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          name,
          full_name: name,
        },
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          // User exists - generate magic link to log them in
          const baseUrl = request.headers.get('host')?.includes('localhost')
            ? `http://${request.headers.get('host')}`
            : `https://${request.headers.get('host')}`;

          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: {
              redirectTo: baseUrl,
            },
          });

          if (linkData?.properties?.action_link) {
            return NextResponse.redirect(linkData.properties.action_link);
          }

          // Fallback: return user info if we can't generate a link
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users.find(u => u.email === email);

          if (existingUser) {
            const { data: subscription } = await supabaseAdmin
              .from('subscriptions')
              .select('*')
              .eq('user_id', existingUser.id)
              .single();

            const { data: tokenBalance } = await supabaseAdmin
              .from('token_balances')
              .select('*')
              .eq('user_id', existingUser.id)
              .single();

            return NextResponse.json({
              message: 'User already exists (could not auto-login)',
              error: linkError?.message,
              user: {
                id: existingUser.id,
                email: existingUser.email,
              },
              subscription,
              tokenBalance,
            });
          }
        }

        console.error('[Test] Auth error:', authError);
        return NextResponse.json(
          { error: 'Failed to create auth user', details: authError.message },
          { status: 500 }
        );
      }

      const userId = authData.user.id;
      console.log('[Test] Created auth user:', userId);

      // Step 2: Create user profile in public.users
      // Note: WNU Platform users table may not have 'name' column - use only core columns
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          email,
          // WNU Platform uses 'username' not 'name' - leave blank for test users
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (userError) {
        console.error('[Test] Error creating user profile:', userError);
        // Try without created_at/updated_at in case those are auto-generated
        const { error: userError2 } = await supabaseAdmin
          .from('users')
          .upsert({
            id: userId,
            email,
          }, { onConflict: 'id' });

        if (userError2) {
          console.error('[Test] Error creating user profile (retry):', userError2);
          return NextResponse.json({
            error: 'Failed to create user profile',
            details: userError2.message,
            hint: userError2.hint,
            userId,
          }, { status: 500 });
        }
      }
      console.log('[Test] Created user profile');

      // Step 3: Create subscription record
      // Note: WNU Platform requires status='active' (check constraint)
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          tier_id: tier,
          status: 'active', // WNU Platform check constraint requires 'active'
        });

      if (subError) {
        console.error('[Test] Error creating subscription:', subError);
        return NextResponse.json({
          error: 'Failed to create subscription',
          details: subError.message,
          hint: subError.hint,
          userId,
        }, { status: 500 });
      }
      console.log('[Test] Created subscription');

      // Step 4: Create token balance
      // Use insert (not upsert) to match WNU Platform pattern
      const { error: tokenError } = await supabaseAdmin
        .from('token_balances')
        .insert({
          user_id: userId,
          balance: tokens,
          lifetime_earned: tokens,
          lifetime_spent: 0,
        });

      if (tokenError) {
        console.error('[Test] Error creating token balance:', tokenError);
        return NextResponse.json({
          error: 'Failed to create token balance',
          details: tokenError.message,
          hint: tokenError.hint,
          userId,
        }, { status: 500 });
      }
      console.log('[Test] Created token balance');

      // Step 6: Generate magic link for auto-login
      const baseUrl = request.headers.get('host')?.includes('localhost')
        ? `http://${request.headers.get('host')}`
        : `https://${request.headers.get('host')}`;

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: baseUrl,
        },
      });

      let loginUrl: string | null = null;
      if (linkData?.properties?.action_link) {
        loginUrl = linkData.properties.action_link;
      }

      if (linkError) {
        console.error('[Test] Error generating magic link:', linkError);
      }

      // If we have a login URL, redirect to it
      if (loginUrl) {
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.json({
        success: true,
        message: 'Test user created successfully (could not auto-login)',
        user: {
          id: userId,
          email,
          name,
          tier,
          tokens,
        },
      });
    }

    // action=info - Get existing user info

    // Find user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get token balance
    const { data: tokenBalance } = await supabaseAdmin
      .from('token_balances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get recent appraisals
    const { data: appraisals } = await supabaseAdmin
      .from('rw_appraisals')
      .select('id, item_name, category, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      user,
      subscription,
      tokenBalance,
      recentAppraisals: appraisals || [],
    });

  } catch (error) {
    console.error('[Test] Error getting test user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get test user', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/test/create-user
 * Body: { email: string }
 * Delete a test user and all their data
 */
export async function DELETE(request: NextRequest) {
  // Safety check - only allow in development
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_ENDPOINTS) {
    return NextResponse.json(
      { error: 'Test endpoints are disabled in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Find user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user.id;

    // Delete in order (respecting foreign keys)
    // 1. Token transactions
    await supabaseAdmin
      .from('token_transactions')
      .delete()
      .eq('user_id', userId);

    // 2. Token balance
    await supabaseAdmin
      .from('token_balances')
      .delete()
      .eq('user_id', userId);

    // 3. Appraisals
    await supabaseAdmin
      .from('rw_appraisals')
      .delete()
      .eq('user_id', userId);

    // 4. Subscription
    await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    // 5. User profile
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    // 6. Auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('[Test] Error deleting auth user:', authDeleteError);
    }

    return NextResponse.json({
      success: true,
      message: 'Test user deleted successfully',
      deletedUserId: userId,
    });

  } catch (error) {
    console.error('[Test] Error deleting test user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete test user', details: errorMessage },
      { status: 500 }
    );
  }
}
