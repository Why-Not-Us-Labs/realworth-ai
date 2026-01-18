import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// DELETE - Delete a comment (own comment or treasure owner can delete any)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const commentId = params.id;

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authToken = authHeader.replace('Bearer ', '');

  // Use service role to bypass RLS for the deletion check
  const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : createClient(supabaseUrl, supabaseAnonKey);

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

  // Verify user
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authToken);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the comment with appraisal info
  const { data: comment, error: commentError } = await supabaseAdmin
    .from('comments')
    .select(`
      id,
      user_id,
      appraisal_id,
      appraisals:appraisal_id (user_id)
    `)
    .eq('id', commentId)
    .single();

  if (commentError || !comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  // Check permission: own comment OR treasure owner
  const isCommentOwner = comment.user_id === user.id;
  const isTreasureOwner = (comment.appraisals as any)?.user_id === user.id;

  if (!isCommentOwner && !isTreasureOwner) {
    return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 });
  }

  // Delete the comment (cascade will handle replies)
  const { error: deleteError } = await supabaseAdmin
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (deleteError) {
    console.error('Error deleting comment:', deleteError);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
