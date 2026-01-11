import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function DELETE(request: NextRequest) {
  console.log('[AccountDelete] Starting account deletion');

  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - missing or invalid token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = getSupabaseAdmin();

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('[AccountDelete] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('[AccountDelete] Deleting account for user:', userId);

    // Step 1: Get user data including Stripe info
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[AccountDelete] Error fetching user data:', userError);
      // Continue anyway - user might not exist in public.users table
    }

    // Step 2: Cancel Stripe subscription if active
    if (userData?.stripe_subscription_id && userData.subscription_status === 'active') {
      try {
        const stripe = getStripe();
        console.log('[AccountDelete] Canceling Stripe subscription:', userData.stripe_subscription_id);

        // Cancel immediately (not at period end) since account is being deleted
        await stripe.subscriptions.cancel(userData.stripe_subscription_id);
        console.log('[AccountDelete] Stripe subscription canceled');
      } catch (stripeError) {
        console.error('[AccountDelete] Error canceling Stripe subscription:', stripeError);
        // Continue with deletion even if Stripe fails
      }
    }

    // Step 3: Delete Stripe customer (optional - removes payment methods)
    if (userData?.stripe_customer_id) {
      try {
        const stripe = getStripe();
        console.log('[AccountDelete] Deleting Stripe customer:', userData.stripe_customer_id);
        await stripe.customers.del(userData.stripe_customer_id);
        console.log('[AccountDelete] Stripe customer deleted');
      } catch (stripeError) {
        console.error('[AccountDelete] Error deleting Stripe customer:', stripeError);
        // Continue with deletion even if Stripe fails
      }
    }

    // Step 4: Delete all user images from Storage
    try {
      console.log('[AccountDelete] Deleting storage files for user:', userId);

      // List all files in user's folder
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from('appraisal-images')
        .list(userId);

      if (listError) {
        console.error('[AccountDelete] Error listing storage files:', listError);
      } else if (files && files.length > 0) {
        // Build full paths for all files (including nested folders)
        const filePaths: string[] = [];

        for (const file of files) {
          if (file.id) {
            // It's a file
            filePaths.push(`${userId}/${file.name}`);
          } else {
            // It's a folder - list its contents
            const { data: subFiles } = await supabaseAdmin.storage
              .from('appraisal-images')
              .list(`${userId}/${file.name}`);

            if (subFiles) {
              for (const subFile of subFiles) {
                filePaths.push(`${userId}/${file.name}/${subFile.name}`);
              }
            }
          }
        }

        if (filePaths.length > 0) {
          console.log('[AccountDelete] Deleting', filePaths.length, 'files');
          const { error: deleteError } = await supabaseAdmin.storage
            .from('appraisal-images')
            .remove(filePaths);

          if (deleteError) {
            console.error('[AccountDelete] Error deleting storage files:', deleteError);
          } else {
            console.log('[AccountDelete] Storage files deleted');
          }
        }
      }
    } catch (storageError) {
      console.error('[AccountDelete] Error cleaning up storage:', storageError);
      // Continue with deletion even if storage cleanup fails
    }

    // Step 5: Delete auth user (this cascades to public.users, appraisals, friendships)
    console.log('[AccountDelete] Deleting auth user');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[AccountDelete] Error deleting auth user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[AccountDelete] Account successfully deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AccountDelete] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete account', details: errorMessage },
      { status: 500 }
    );
  }
}
