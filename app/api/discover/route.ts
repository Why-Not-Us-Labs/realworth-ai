import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    // If no userId, return only public items
    if (!userId) {
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          users:user_id (name, picture)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return NextResponse.json({
        treasures: data?.map(t => ({ ...t, visibility: 'public' })) || []
      });
    }

    // Get user's accepted friends
    const { data: friendships, error: friendsError } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (friendsError) throw friendsError;

    // Extract friend IDs (could be in either requester_id or addressee_id column)
    const friendIds = friendships?.map(f =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    ) || [];

    // Query: public items OR friends' items (all of them, not just public)
    let query = supabase
      .from('appraisals')
      .select(`
        *,
        users:user_id (name, picture)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (friendIds.length > 0) {
      // Get public items OR items from friends (regardless of is_public)
      // But exclude current user's own items (they see those on their profile)
      query = query.or(`is_public.eq.true,user_id.in.(${friendIds.join(',')})`);
      query = query.neq('user_id', userId);
    } else {
      // No friends - just show public items (excluding own)
      query = query.eq('is_public', true);
      query = query.neq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Mark items with visibility type
    const treasures = data?.map(treasure => {
      const isFriend = friendIds.includes(treasure.user_id);
      const isPublic = treasure.is_public;

      return {
        ...treasure,
        // Visibility: 'public' = anyone can see, 'friends' = visible because you're friends
        visibility: isPublic ? 'public' : (isFriend ? 'friends' : 'public')
      };
    }) || [];

    return NextResponse.json({ treasures });
  } catch (error) {
    console.error('Error fetching discover treasures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch treasures' },
      { status: 500 }
    );
  }
}
