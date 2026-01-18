import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { socialService } from '@/services/socialService';

// Maximum items per user to prevent feed domination
const MAX_ITEMS_PER_USER = 5;
// Fetch extra items to ensure we have enough after per-user filtering
const FETCH_MULTIPLIER = 3;

/**
 * Filter items to cap at MAX_ITEMS_PER_USER per user
 * This ensures variety in the feed when one user has many items
 */
function capItemsPerUser<T extends { user_id: string }>(items: T[], maxPerUser: number): T[] {
  const userCounts: Record<string, number> = {};
  const result: T[] = [];

  for (const item of items) {
    const userId = item.user_id;
    const currentCount = userCounts[userId] || 0;

    if (currentCount < maxPerUser) {
      result.push(item);
      userCounts[userId] = currentCount + 1;
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const targetCount = 50;

  try {
    // If no userId, return only public items (no social state)
    if (!userId) {
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          users:user_id (name, picture)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(targetCount * FETCH_MULTIPLIER);

      if (error) throw error;

      // Apply per-user cap
      const cappedData = capItemsPerUser(data || [], MAX_ITEMS_PER_USER).slice(0, targetCount);

      return NextResponse.json({
        treasures: cappedData.map(t => ({
          ...t,
          visibility: 'public',
          isLiked: false,
          isSaved: false,
        }))
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
    // Fetch extra items to ensure variety after per-user filtering
    let query = supabase
      .from('appraisals')
      .select(`
        *,
        users:user_id (name, picture)
      `)
      .order('created_at', { ascending: false })
      .limit(targetCount * FETCH_MULTIPLIER);

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

    // Apply per-user cap to ensure feed variety
    const cappedData = capItemsPerUser(data || [], MAX_ITEMS_PER_USER).slice(0, targetCount);

    // Get user's likes and saves for these items
    const appraisalIds = cappedData.map(t => t.id);
    const [likedIds, savedIds] = await Promise.all([
      socialService.getUserLikedIds(userId, appraisalIds),
      socialService.getUserSavedIds(userId, appraisalIds),
    ]);

    // Mark items with visibility type and social state
    const treasures = cappedData.map(treasure => {
      const isFriend = friendIds.includes(treasure.user_id);
      const isPublic = treasure.is_public;

      return {
        ...treasure,
        // Visibility: 'public' = anyone can see, 'friends' = visible because you're friends
        visibility: isPublic ? 'public' : (isFriend ? 'friends' : 'public'),
        isLiked: likedIds.includes(treasure.id),
        isSaved: savedIds.includes(treasure.id),
      };
    });

    return NextResponse.json({ treasures });
  } catch (error) {
    console.error('Error fetching discover treasures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch treasures' },
      { status: 500 }
    );
  }
}
