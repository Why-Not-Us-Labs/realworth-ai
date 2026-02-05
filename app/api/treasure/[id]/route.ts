
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const treasureId = params.id;

  // Get auth token from Authorization header
  const authHeader = req.headers.get('authorization');
  const authToken = authHeader?.replace('Bearer ', '');

  // Get current user ID if authenticated
  let currentUserId: string | null = null;
  if (authToken) {
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await authClient.auth.getUser(authToken);
    currentUserId = user?.id || null;
  }

  // Use service role key if available to bypass RLS
  // Otherwise, create an authenticated client with the user's token (for RLS to work)
  // Fall back to anon key for public-only access
  const supabase = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : authToken
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${authToken}` } }
        })
      : createClient(supabaseUrl, supabaseAnonKey);

  // Fetch the treasure - service role bypasses RLS
  // If using anon key, RLS will restrict to public items only
  let treasure = null;
  let isOwner = false;

  if (supabaseServiceKey) {
    // With service role, we can fetch any treasure
    const { data, error } = await supabase
      .from('appraisals')
      .select('*')
      .eq('id', treasureId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Treasure not found' }, { status: 404 });
    }

    treasure = data;
    isOwner = currentUserId === treasure.user_id;

    // Check access: owner, public, or friend
    if (!isOwner && !treasure.is_public) {
      // Check if viewer is a friend of the owner
      let isFriend = false;
      if (currentUserId) {
        const { data: friendship } = await supabase
          .from('friendships')
          .select('status')
          .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${treasure.user_id}),and(requester_id.eq.${treasure.user_id},addressee_id.eq.${currentUserId})`)
          .eq('status', 'accepted')
          .maybeSingle();

        isFriend = !!friendship;
      }

      if (!isFriend) {
        return NextResponse.json({ error: 'Treasure is private' }, { status: 404 });
      }
    }
  } else {
    // Without service role, try to fetch with explicit conditions
    // First check if user owns it
    if (currentUserId) {
      const { data: ownedTreasure } = await supabase
        .from('appraisals')
        .select('*')
        .eq('id', treasureId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (ownedTreasure) {
        treasure = ownedTreasure;
        isOwner = true;
      }
    }

    // If not owned, try to fetch as public
    if (!treasure) {
      const { data: publicTreasure } = await supabase
        .from('appraisals')
        .select('*')
        .eq('id', treasureId)
        .eq('is_public', true)
        .maybeSingle();

      if (publicTreasure) {
        treasure = publicTreasure;
        isOwner = currentUserId === publicTreasure.user_id;
      }
    }

    // If not owned and not public, check if user is a friend of the owner
    if (!treasure && currentUserId) {
      // First fetch the treasure to get the owner
      const { data: privateTreasure } = await supabase
        .from('appraisals')
        .select(`
          *,
          users:user_id (id, name, picture)
        `)
        .eq('id', treasureId)
        .maybeSingle();

      if (privateTreasure) {
        // Check if current user is friends with the owner
        const { data: friendship } = await supabase
          .from('friendships')
          .select('status')
          .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${privateTreasure.user_id}),and(requester_id.eq.${privateTreasure.user_id},addressee_id.eq.${currentUserId})`)
          .eq('status', 'accepted')
          .maybeSingle();

        if (friendship) {
          treasure = privateTreasure;
          isOwner = false;
        }
      }
    }

    if (!treasure) {
      return NextResponse.json({ error: 'Treasure not found or private' }, { status: 404 });
    }
  }

  // Map WNU Platform columns to expected format
  const mappedTreasure = {
    ...treasure,
    // Map column names for backwards compatibility
    image_url: treasure.ai_image_url || (treasure.image_urls && treasure.image_urls[0]) || '',
    reasoning: treasure.reasoning || '',
    references: treasure.references || [],
  };

  return NextResponse.json({
    treasure: mappedTreasure,
    isOwner,
  });
}
