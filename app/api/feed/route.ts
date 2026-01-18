import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));

  // Get user ID from auth header if available
  let userId: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    userId = user?.id || null;
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Fetch public appraisals with user data
  const { data: appraisals, error } = await supabaseAdmin
    .from('appraisals')
    .select(`
      id,
      item_name,
      image_url,
      image_urls,
      price_low,
      price_high,
      currency,
      category,
      era,
      created_at,
      rarity_score,
      like_count,
      comment_count,
      description,
      user_id,
      users:user_id (
        id,
        name,
        picture
      )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Feed fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
  }

  // If user is logged in, fetch their likes and saves for these appraisals
  let userLikes: Set<string> = new Set();
  let userSaves: Set<string> = new Set();

  if (userId && appraisals && appraisals.length > 0) {
    const appraisalIds = appraisals.map(a => a.id);

    const [likesResult, savesResult] = await Promise.all([
      supabaseAdmin
        .from('likes')
        .select('appraisal_id')
        .eq('user_id', userId)
        .in('appraisal_id', appraisalIds),
      supabaseAdmin
        .from('saves')
        .select('appraisal_id')
        .eq('user_id', userId)
        .in('appraisal_id', appraisalIds),
    ]);

    if (likesResult.data) {
      userLikes = new Set(likesResult.data.map(l => l.appraisal_id));
    }
    if (savesResult.data) {
      userSaves = new Set(savesResult.data.map(s => s.appraisal_id));
    }
  }

  // Transform to FeedPostData format
  const posts = (appraisals || []).map(appraisal => {
    // users is an object when using foreign key relation (not an array)
    const user = appraisal.users as unknown as { id: string; name: string; picture: string | null } | null;

    return {
      id: appraisal.id,
      item_name: appraisal.item_name,
      image_url: appraisal.image_url,
      image_urls: appraisal.image_urls,
      price_low: appraisal.price_low,
      price_high: appraisal.price_high,
      currency: appraisal.currency || 'USD',
      category: appraisal.category,
      era: appraisal.era,
      created_at: appraisal.created_at,
      rarity_score: appraisal.rarity_score,
      like_count: appraisal.like_count || 0,
      comment_count: appraisal.comment_count || 0,
      description: appraisal.description,
      user: {
        id: user?.id || appraisal.user_id,
        name: user?.name || 'Anonymous',
        picture: user?.picture || null,
      },
      isLiked: userLikes.has(appraisal.id),
      isSaved: userSaves.has(appraisal.id),
    };
  });

  return NextResponse.json({ posts });
}
