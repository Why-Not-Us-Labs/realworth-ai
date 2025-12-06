import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const appraisalCount = parseInt(searchParams.get('appraisalCount') || '0', 10);

    const supabase = getSupabaseAdmin();

    // Get active surveys
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (surveysError || !surveys?.length) {
      return NextResponse.json({ survey: null });
    }

    // If user is logged in, filter out dismissed and already completed surveys
    let eligibleSurveys = surveys;

    if (userId) {
      // Get dismissed surveys
      const { data: dismissals } = await supabase
        .from('survey_dismissals')
        .select('survey_id')
        .eq('user_id', userId);

      const dismissedIds = new Set(dismissals?.map(d => d.survey_id) || []);

      // Get completed surveys
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('survey_id')
        .eq('user_id', userId)
        .eq('completed', true);

      const completedIds = new Set(responses?.map(r => r.survey_id) || []);

      // Filter out dismissed and completed
      eligibleSurveys = surveys.filter(
        s => !dismissedIds.has(s.id) && !completedIds.has(s.id)
      );
    }

    // Find survey that matches trigger conditions
    for (const survey of eligibleSurveys) {
      if (survey.trigger_type === 'appraisal_count') {
        if (appraisalCount >= (survey.trigger_value || 0)) {
          return NextResponse.json({ survey });
        }
      } else if (survey.trigger_type === 'manual') {
        // Manual surveys are always eligible
        return NextResponse.json({ survey });
      }
    }

    return NextResponse.json({ survey: null });
  } catch (error) {
    console.error('[Surveys] Error fetching active survey:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey' },
      { status: 500 }
    );
  }
}
