import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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

  // Fetch public appraisals (WNU Platform schema)
  const { data: appraisals, error } = await supabaseAdmin
    .from('rw_appraisals')
    .select(`
      id,
      item_name,
      ai_image_url,
      input_images,
      price_low,
      price_high,
      currency,
      category,
      era,
      created_at,
      description,
      user_id
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
    return {
      id: appraisal.id,
      item_name: appraisal.item_name,
      image_url: appraisal.ai_image_url || (appraisal.input_images && appraisal.input_images[0]) || '',
      image_urls: appraisal.input_images || [],
      price_low: appraisal.price_low,
      price_high: appraisal.price_high,
      currency: appraisal.currency || 'USD',
      category: appraisal.category,
      era: appraisal.era,
      created_at: appraisal.created_at,
      rarity_score: null,
      like_count: 0,
      comment_count: 0,
      description: appraisal.description,
      user: {
        id: appraisal.user_id,
        name: 'Collector',
        picture: null,
      },
      isLiked: userLikes.has(appraisal.id),
      isSaved: userSaves.has(appraisal.id),
    };
  });

  return NextResponse.json({ posts });
}
