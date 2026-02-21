import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isBullseyeAdmin } from '@/lib/partnerConfig';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function authenticatePartnerAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !isBullseyeAdmin(user.email)) return null;
  return user;
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await authenticatePartnerAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appraisalId, status, adjustedOffer } = (await req.json()) as {
      appraisalId: string;
      status?: 'accepted' | 'declined' | 'pending' | 'fulfilled' | 'no_show';
      adjustedOffer?: number;
    };

    if (!appraisalId) {
      return NextResponse.json({ error: 'appraisalId required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Build update object
    const update: Record<string, unknown> = {};

    if (status) {
      update.buy_offer_status = status;
      if (status === 'accepted' || status === 'declined') {
        update.completed_at = new Date().toISOString();
      }
      if (status === 'fulfilled') {
        update.fulfilled_at = new Date().toISOString();
      }
    }

    if (adjustedOffer !== undefined && adjustedOffer > 0) {
      // Fetch current buy_offer, update the amount
      const { data: current } = await admin
        .from('rw_appraisals')
        .select('buy_offer')
        .eq('id', appraisalId)
        .eq('partner_id', 'bullseye')
        .single();

      if (current?.buy_offer) {
        const offer = current.buy_offer as Record<string, unknown>;
        update.buy_offer = { ...offer, amount: adjustedOffer, adjustedBy: user.email };
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { error } = await admin
      .from('rw_appraisals')
      .update(update)
      .eq('id', appraisalId)
      .eq('partner_id', 'bullseye');

    if (error) {
      console.error('[Partner Dashboard Appraisal] Update error:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Partner Dashboard Appraisal] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
