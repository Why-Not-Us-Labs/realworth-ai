import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const SURVEY_INTERVAL = 50; // Show survey every 50 appraisals

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

    // If user is logged in, check if they're due for a survey
    if (userId) {
      // Get user's last survey appraisal count
      const { data: userData } = await supabase
        .from('users')
        .select('last_survey_appraisal_count')
        .eq('id', userId)
        .single();

      const lastSurveyCount = userData?.last_survey_appraisal_count || 0;

      // Check if user is due for a survey (every 50 appraisals)
      // User needs to have done at least SURVEY_INTERVAL more appraisals since last survey
      if (appraisalCount < lastSurveyCount + SURVEY_INTERVAL) {
        return NextResponse.json({ survey: null });
      }

      // Get dismissed surveys (permanent dismissals still respected)
      const { data: dismissals } = await supabase
        .from('survey_dismissals')
        .select('survey_id')
        .eq('user_id', userId);

      const dismissedIds = new Set(dismissals?.map(d => d.survey_id) || []);

      // Filter out permanently dismissed surveys
      const eligibleSurveys = surveys.filter(s => !dismissedIds.has(s.id));

      // Return first eligible survey (user is due for one)
      if (eligibleSurveys.length > 0) {
        return NextResponse.json({ survey: eligibleSurveys[0] });
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
