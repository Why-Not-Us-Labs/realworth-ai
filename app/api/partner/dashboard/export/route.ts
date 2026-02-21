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

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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

    let dateFilter: string | null = null;
    if (range === '7d') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (range === '30d') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    let query = admin
      .from('rw_appraisals')
      .select('id, item_name, buy_offer, buy_offer_status, decline_reason, sneaker_details, source_store, created_at, completed_at')
      .eq('partner_id', 'bullseye')
      .order('created_at', { ascending: false });

    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }
    if (sourceStore) {
      query = query.eq('source_store', sourceStore);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[Partner Export] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    const headers = ['ID', 'Item Name', 'Brand', 'Model', 'Size', 'Condition', 'Offer Amount', 'Status', 'Decline Reason', 'Store', 'Created', 'Completed'];
    const csvLines = [headers.join(',')];

    for (const row of rows || []) {
      const offer = row.buy_offer as { amount?: number } | null;
      const sneaker = row.sneaker_details as { brand?: string; model?: string; size?: string; conditionGrade?: string } | null;

      csvLines.push([
        escapeCSV(row.id),
        escapeCSV(row.item_name),
        escapeCSV(sneaker?.brand),
        escapeCSV(sneaker?.model),
        escapeCSV(sneaker?.size),
        escapeCSV(sneaker?.conditionGrade),
        escapeCSV(offer?.amount?.toFixed(2)),
        escapeCSV(row.buy_offer_status),
        escapeCSV(row.decline_reason),
        escapeCSV(row.source_store),
        escapeCSV(row.created_at?.substring(0, 10)),
        escapeCSV(row.completed_at?.substring(0, 10)),
      ].join(','));
    }

    const csv = csvLines.join('\n');
    const filename = `bullseye-appraisals-${new Date().toISOString().substring(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error('[Partner Export] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
