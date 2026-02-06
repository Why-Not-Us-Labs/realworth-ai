import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET - Fetch comments for an appraisal
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

  // Fetch comments with user info
  const { data: comments, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      parent_id,
      created_at,
      user_id,
      users:user_id (id, name, picture)
    `)
    .eq('appraisal_id', appraisalId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }

  // Organize into threads (top-level and replies)
  const topLevelComments = comments?.filter(c => !c.parent_id) || [];
  const replies = comments?.filter(c => c.parent_id) || [];

  // Attach replies to their parent comments
  const threaded = topLevelComments.map(comment => ({
    ...comment,
    replies: replies.filter(r => r.parent_id === comment.id),
  }));

  return NextResponse.json({ comments: threaded });
}

// POST - Add a new comment
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authToken = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  });

  // Verify user
  const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { appraisalId, content, parentId } = body;

  if (!appraisalId || !content) {
    return NextResponse.json({ error: 'appraisalId and content are required' }, { status: 400 });
  }

  // Validate content length
  if (content.length > 500) {
    return NextResponse.json({ error: 'Comment too long (max 500 characters)' }, { status: 400 });
  }

  if (content.trim().length === 0) {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
  }

  // Verify the appraisal exists and user has access
  const { data: appraisal, error: appraisalError } = await supabase
    .from('rw_appraisals')
    .select('id, user_id, is_public')
    .eq('id', appraisalId)
    .single();

  if (appraisalError || !appraisal) {
    return NextResponse.json({ error: 'Appraisal not found' }, { status: 404 });
  }

  // Check access: public treasures or owner or friend
  if (!appraisal.is_public && appraisal.user_id !== user.id) {
    // Check if user is a friend
    const { data: friendship } = await supabase
      .from('friendships')
      .select('status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${appraisal.user_id}),and(requester_id.eq.${appraisal.user_id},addressee_id.eq.${user.id})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!friendship) {
      return NextResponse.json({ error: 'Cannot comment on this treasure' }, { status: 403 });
    }
  }

  // If replying, verify parent comment exists
  if (parentId) {
    const { data: parentComment } = await supabase
      .from('comments')
      .select('id')
      .eq('id', parentId)
      .eq('appraisal_id', appraisalId)
      .single();

    if (!parentComment) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
    }
  }

  // Insert comment
  const { data: comment, error: insertError } = await supabase
    .from('comments')
    .insert({
      user_id: user.id,
      appraisal_id: appraisalId,
      content: content.trim(),
      parent_id: parentId || null,
    })
    .select(`
      id,
      content,
      parent_id,
      created_at,
      user_id,
      users:user_id (id, name, picture)
    `)
    .single();

  if (insertError) {
    console.error('Error inserting comment:', insertError);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }

  return NextResponse.json({ comment });
}
