import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
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

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = 20;

    // Get user's saves with full appraisal data
    let query = supabase
      .from('saves')
      .select(`
        id,
        created_at,
        appraisals:appraisal_id (
          id,
          item_name,
          ai_image_url,
          image_urls,
          price_low,
          price_high,
          currency,
          category,
          era,
          created_at,
          user_id
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching saved items:', error);
      throw error;
    }

    const saves = data ?? [];
    const hasMore = saves.length > limit;

    if (hasMore) {
      saves.pop();
    }

    // Transform to match Treasure interface and mark as saved
    const treasures = saves
      .filter(s => s.appraisals !== null)
      .map(s => {
        const appraisal = s.appraisals as any;
        return {
          id: appraisal.id,
          item_name: appraisal.item_name,
          image_url: appraisal.ai_image_url || (appraisal.image_urls && appraisal.image_urls[0]) || '',
          price_low: appraisal.price_low,
          price_high: appraisal.price_high,
          currency: appraisal.currency,
          category: appraisal.category,
          era: appraisal.era,
          created_at: appraisal.created_at,
          user_id: appraisal.user_id,
          like_count: 0,
          isLiked: false,
          isSaved: true,
          savedAt: s.created_at,
        };
      });

    return NextResponse.json({
      treasures,
      nextCursor: hasMore ? saves[saves.length - 1]?.created_at : undefined,
    });
  } catch (error) {
    console.error('Error in saved items API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved items' },
      { status: 500 }
    );
  }
}
