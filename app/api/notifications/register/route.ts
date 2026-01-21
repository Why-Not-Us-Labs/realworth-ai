import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/notifications/register
 * Register a device token for push notifications
 */
export async function POST(request: NextRequest) {
  console.log('[Notifications] Registering device token');

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
      console.error('[Notifications] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      );
    }

    const { deviceToken, platform } = await request.json();

    if (!deviceToken || typeof deviceToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid deviceToken' },
        { status: 400 }
      );
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform - must be ios, android, or web' },
        { status: 400 }
      );
    }

    console.log('[Notifications] Registering token for user:', user.id, 'platform:', platform);

    // Upsert the device token (update if exists, insert if new)
    const { data, error } = await supabaseAdmin
      .from('device_tokens')
      .upsert(
        {
          user_id: user.id,
          token: deviceToken,
          platform,
          updated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Notifications] Error registering device token:', error);
      return NextResponse.json(
        { error: 'Failed to register device token', details: error.message },
        { status: 500 }
      );
    }

    console.log('[Notifications] Device token registered successfully');
    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to register device token', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/register
 * Unregister a device token (e.g., on logout)
 */
export async function DELETE(request: NextRequest) {
  console.log('[Notifications] Unregistering device token');

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
      console.error('[Notifications] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      );
    }

    const { deviceToken } = await request.json();

    if (!deviceToken || typeof deviceToken !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid deviceToken' },
        { status: 400 }
      );
    }

    console.log('[Notifications] Unregistering token for user:', user.id);

    // Delete the device token
    const { error } = await supabaseAdmin
      .from('device_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token', deviceToken);

    if (error) {
      console.error('[Notifications] Error unregistering device token:', error);
      return NextResponse.json(
        { error: 'Failed to unregister device token', details: error.message },
        { status: 500 }
      );
    }

    console.log('[Notifications] Device token unregistered successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to unregister device token', details: errorMessage },
      { status: 500 }
    );
  }
}
