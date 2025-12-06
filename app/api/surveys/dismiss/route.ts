import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { surveyId, userId } = await request.json();

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Missing survey ID' },
        { status: 400 }
      );
    }

    // Only record dismissal if user is logged in
    if (!userId) {
      return NextResponse.json({ success: true });
    }

    const supabase = getSupabaseAdmin();

    // Insert dismissal (ignore conflict if already dismissed)
    const { error } = await supabase
      .from('survey_dismissals')
      .upsert(
        {
          survey_id: surveyId,
          user_id: userId,
          dismissed_at: new Date().toISOString(),
        },
        { onConflict: 'survey_id,user_id' }
      );

    if (error) {
      console.error('[Surveys] Error recording dismissal:', error);
      // Don't fail the request - user experience is more important
    } else {
      console.log('[Surveys] Survey dismissed:', { surveyId, userId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Surveys] Unexpected error:', error);
    return NextResponse.json({ success: true }); // Don't fail UX for dismissals
  }
}
