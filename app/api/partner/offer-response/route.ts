import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * PATCH: Persist accept/decline status for a partner buy offer.
 * No auth required — partner flow is anonymous.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { appraisalId, status, declineReason } = (await req.json()) as {
      appraisalId: string;
      status: 'accepted' | 'declined';
      declineReason?: string;
    };

    if (!appraisalId || !['accepted', 'declined'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request. Required: appraisalId, status (accepted|declined)' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const updateData: Record<string, string> = { buy_offer_status: status };
    if (status === 'declined' && declineReason) {
      updateData.decline_reason = declineReason;
    }

    const { error } = await supabase
      .from('rw_appraisals')
      .update(updateData)
      .eq('id', appraisalId)
      .not('partner_id', 'is', null); // Safety: only update partner appraisals

    if (error) {
      console.error('[Partner Offer Response] DB error:', error);
      return NextResponse.json({ error: 'Failed to update offer status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (e) {
    console.error('[Partner Offer Response] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
