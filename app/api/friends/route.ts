import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { notificationService } from '@/services/notificationService';

/**
 * POST /api/friends
 * Send a friend request
 * Body: { addresseeId: string }
 */
export async function POST(request: NextRequest) {
  console.log('[Friends API] Processing friend request');

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
      console.error('[Friends API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      );
    }

    const { addresseeId } = await request.json();

    if (!addresseeId || typeof addresseeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid addresseeId' },
        { status: 400 }
      );
    }

    // Check if friendship already exists
    const { data: existingFriendship } = await supabaseAdmin
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
      .single();

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'Friendship already exists', status: existingFriendship.status },
        { status: 400 }
      );
    }

    // Create friendship request
    const { data: friendship, error: insertError } = await supabaseAdmin
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Friends API] Error creating friendship:', insertError);
      return NextResponse.json(
        { error: 'Failed to send friend request', details: insertError.message },
        { status: 500 }
      );
    }

    // Get requester's name for the notification
    const { data: requesterProfile } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    // Send push notification to the addressee (non-blocking)
    try {
      if (notificationService.isConfigured() && requesterProfile?.name) {
        await notificationService.notifyFriendRequest(addresseeId, requesterProfile.name);
        console.log('[Friends API] Push notification sent for friend request');
      }
    } catch (notificationError) {
      console.error('[Friends API] Failed to send push notification (non-blocking):', notificationError);
    }

    console.log('[Friends API] Friend request sent successfully');
    return NextResponse.json({ success: true, friendshipId: friendship.id });
  } catch (error) {
    console.error('[Friends API] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to send friend request', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/friends
 * Respond to a friend request (accept or decline)
 * Body: { friendshipId: string, response: 'accepted' | 'declined' }
 */
export async function PATCH(request: NextRequest) {
  console.log('[Friends API] Processing friend request response');

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
      console.error('[Friends API] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - invalid token' },
        { status: 401 }
      );
    }

    const { friendshipId, response } = await request.json();

    if (!friendshipId || typeof friendshipId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid friendshipId' },
        { status: 400 }
      );
    }

    if (!response || !['accepted', 'declined'].includes(response)) {
      return NextResponse.json(
        { error: 'Invalid response - must be "accepted" or "declined"' },
        { status: 400 }
      );
    }

    // Get the friendship to verify the user is the addressee
    const { data: friendship, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .eq('id', friendshipId)
      .single();

    if (fetchError || !friendship) {
      return NextResponse.json(
        { error: 'Friendship not found' },
        { status: 404 }
      );
    }

    if (friendship.addressee_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to respond to this request' },
        { status: 403 }
      );
    }

    if (friendship.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been responded to' },
        { status: 400 }
      );
    }

    // Update the friendship status
    const { error: updateError } = await supabaseAdmin
      .from('friendships')
      .update({ status: response, updated_at: new Date().toISOString() })
      .eq('id', friendshipId);

    if (updateError) {
      console.error('[Friends API] Error updating friendship:', updateError);
      return NextResponse.json(
        { error: 'Failed to respond to friend request', details: updateError.message },
        { status: 500 }
      );
    }

    // If accepted, send push notification to the requester
    if (response === 'accepted') {
      try {
        // Get addressee's name for the notification
        const { data: addresseeProfile } = await supabaseAdmin
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        if (notificationService.isConfigured() && addresseeProfile?.name) {
          await notificationService.notifyFriendAccepted(friendship.requester_id, addresseeProfile.name);
          console.log('[Friends API] Push notification sent for friend acceptance');
        }
      } catch (notificationError) {
        console.error('[Friends API] Failed to send push notification (non-blocking):', notificationError);
      }
    }

    console.log('[Friends API] Friend request response processed successfully');
    return NextResponse.json({ success: true, status: response });
  } catch (error) {
    console.error('[Friends API] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to respond to friend request', details: errorMessage },
      { status: 500 }
    );
  }
}
