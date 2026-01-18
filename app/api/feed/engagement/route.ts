import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET - Fetch engagement stats for an appraisal
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const appraisalId = searchParams.get('appraisalId');

  if (!appraisalId) {
    return NextResponse.json({ error: 'appraisalId is required' }, { status: 400 });
  }

  // Get auth token if available
  const authHeader = req.headers.get('authorization');
  const authToken = authHeader?.replace('Bearer ', '');

  const supabase = authToken
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${authToken}` } }
      })
    : createClient(supabaseUrl, supabaseAnonKey);

  let userId: string | null = null;
  if (authToken) {
    const { data: { user } } = await supabase.auth.getUser(authToken);
    userId = user?.id || null;
  }

  // Get like count
  const { count: likeCount } = await supabase
    .from('appraisal_likes')
    .select('*', { count: 'exact', head: true })
    .eq('appraisal_id', appraisalId);

  // Get comment count
  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('appraisal_id', appraisalId);

  // Check if current user has liked
  let isLiked = false;
  if (userId) {
    const { data: likeData } = await supabase
      .from('appraisal_likes')
      .select('id')
      .eq('appraisal_id', appraisalId)
      .eq('user_id', userId)
      .maybeSingle();
    isLiked = !!likeData;
  }

  // Check if current user has saved
  let isSaved = false;
  if (userId) {
    const { data: saveData } = await supabase
      .from('appraisal_saves')
      .select('id')
      .eq('appraisal_id', appraisalId)
      .eq('user_id', userId)
      .maybeSingle();
    isSaved = !!saveData;
  }

  return NextResponse.json({
    likeCount: likeCount || 0,
    commentCount: commentCount || 0,
    isLiked,
    isSaved,
  });
}
