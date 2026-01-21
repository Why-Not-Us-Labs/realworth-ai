import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface QueueItem {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: {
    itemName: string;
    priceRange: { low: number; high: number };
    currency: string;
  } | null;
  appraisal_id: string | null;
  error_message: string | null;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get auth token from Authorization header
    const authHeader = req.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get recent queue items (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: items, error: fetchError } = await supabaseAdmin
      .from('appraisal_queue')
      .select('id, status, created_at, started_at, completed_at, result, appraisal_id, error_message')
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[Queue] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
    }

    // Calculate stats
    const stats: QueueStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: items?.length || 0,
    };

    const queueItems: QueueItem[] = (items || []).map(item => {
      // Count stats
      if (item.status === 'pending') stats.pending++;
      else if (item.status === 'processing') stats.processing++;
      else if (item.status === 'completed') stats.completed++;
      else if (item.status === 'failed') stats.failed++;

      return {
        id: item.id,
        status: item.status,
        created_at: item.created_at,
        started_at: item.started_at,
        completed_at: item.completed_at,
        result: item.result ? {
          itemName: item.result.itemName,
          priceRange: item.result.priceRange,
          currency: item.result.currency,
        } : null,
        appraisal_id: item.appraisal_id,
        error_message: item.error_message,
      };
    });

    // Find newly completed items (completed in last poll cycle, ~5 seconds)
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const newlyCompleted = queueItems.filter(
      item => item.status === 'completed' &&
      item.completed_at &&
      item.completed_at > fiveSecondsAgo
    );

    return NextResponse.json({
      items: queueItems,
      stats,
      newlyCompleted: newlyCompleted.map(item => ({
        id: item.id,
        appraisalId: item.appraisal_id,
        itemName: item.result?.itemName,
        value: item.result?.priceRange
          ? (item.result.priceRange.low + item.result.priceRange.high) / 2
          : 0,
        currency: item.result?.currency || 'USD',
      })),
    });

  } catch (error) {
    console.error('[Queue] Error fetching status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue status' },
      { status: 500 }
    );
  }
}
