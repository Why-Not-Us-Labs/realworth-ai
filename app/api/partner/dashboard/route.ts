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

export async function GET(req: NextRequest) {
  try {
    const user = await authenticatePartnerAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';
    const sourceStore = searchParams.get('source_store') || null;

    const admin = getSupabaseAdmin();

    // Build date filter
    let dateFilter: string | null = null;
    if (range === '7d') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (range === '30d') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Fetch all partner appraisals
    let query = admin
      .from('rw_appraisals')
      .select('id, item_name, input_images, buy_offer, buy_offer_status, decline_reason, sneaker_details, source_store, created_at, completed_at')
      .eq('partner_id', 'bullseye')
      .order('created_at', { ascending: false });

    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }
    if (sourceStore) {
      query = query.eq('source_store', sourceStore);
    }

    const { data: appraisals, error } = await query;

    if (error) {
      console.error('[Partner Dashboard] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    const rows = appraisals || [];

    // Build pipeline
    const pipeline: Record<string, typeof pipelineItems> = {
      pending: [],
      accepted: [],
      declined: [],
      review: [],
    };

    type PipelineAppraisal = {
      id: string;
      itemName: string;
      thumbnailUrl: string | null;
      offerAmount: number;
      buyOfferStatus: string;
      declineReason: string | null;
      sneakerBrand: string | null;
      sneakerModel: string | null;
      sneakerSize: string | null;
      conditionGrade: string | null;
      sourceStore: string | null;
      requiresManagerReview: boolean;
      createdAt: string;
      completedAt: string | null;
    };

    const pipelineItems: PipelineAppraisal[] = [];

    let totalOfferValue = 0;
    let acceptedCount = 0;
    let decidedCount = 0;

    const storeCounts: Record<string, number> = {};

    for (const row of rows) {
      const offer = row.buy_offer as { amount?: number; requiresManagerReview?: boolean } | null;
      const sneaker = row.sneaker_details as { brand?: string; model?: string; size?: string; conditionGrade?: string } | null;
      const status = (row.buy_offer_status as string) || 'pending';
      const offerAmount = offer?.amount ?? 0;

      const item: PipelineAppraisal = {
        id: row.id,
        itemName: row.item_name || 'Unknown Item',
        thumbnailUrl: (row.input_images as string[] | null)?.[0] || null,
        offerAmount,
        buyOfferStatus: status,
        declineReason: (row.decline_reason as string) || null,
        sneakerBrand: sneaker?.brand || null,
        sneakerModel: sneaker?.model || null,
        sneakerSize: sneaker?.size || null,
        conditionGrade: sneaker?.conditionGrade || null,
        sourceStore: row.source_store || null,
        requiresManagerReview: offer?.requiresManagerReview ?? false,
        createdAt: row.created_at,
        completedAt: row.completed_at || null,
      };

      const bucket = status === 'review' ? 'review' : status === 'accepted' ? 'accepted' : status === 'declined' ? 'declined' : 'pending';
      pipeline[bucket].push(item);

      if (status === 'accepted') {
        totalOfferValue += offerAmount;
        acceptedCount++;
        decidedCount++;
      } else if (status === 'declined') {
        decidedCount++;
      }

      // Store counts
      const store = row.source_store || 'unknown';
      storeCounts[store] = (storeCounts[store] || 0) + 1;
    }

    // Calculate metrics
    const totalAppraisals = rows.length;
    const offerAmounts = rows
      .map(r => (r.buy_offer as { amount?: number } | null)?.amount ?? 0)
      .filter(a => a > 0);
    const avgOfferAmount = offerAmounts.length > 0
      ? offerAmounts.reduce((a, b) => a + b, 0) / offerAmounts.length
      : 0;
    const acceptRate = decidedCount > 0 ? Math.round((acceptedCount / decidedCount) * 100) : 0;
    const pendingReviewCount = pipeline.review.length;

    // Build chart data (daily counts)
    const dailyCounts: Record<string, { count: number; value: number }> = {};
    for (const row of rows) {
      const date = row.created_at.substring(0, 10);
      if (!dailyCounts[date]) dailyCounts[date] = { count: 0, value: 0 };
      dailyCounts[date].count++;
      dailyCounts[date].value += (row.buy_offer as { amount?: number } | null)?.amount ?? 0;
    }

    const chartData = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, count: d.count, value: Math.round(d.value * 100) / 100 }));

    // Build stores list
    const stores = Object.entries(storeCounts).map(([id, count]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      count,
    }));

    // Build decline reasons summary
    const reasonCounts: Record<string, number> = {};
    for (const row of rows) {
      const reason = row.decline_reason as string | null;
      if (reason) {
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    }
    const declineReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      metrics: {
        totalAppraisals,
        avgOfferAmount: Math.round(avgOfferAmount * 100) / 100,
        acceptRate,
        totalOfferValue: Math.round(totalOfferValue * 100) / 100,
        pendingReviewCount,
      },
      pipeline,
      chartData,
      stores,
      declineReasons,
    });
  } catch (e) {
    console.error('[Partner Dashboard] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
