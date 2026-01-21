import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { processQueueItem } from '@/lib/queueProcessor';

// Vercel background processing - return fast, process in background
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const body = await req.json();
    const { imageUrls, condition = 'Good' } = body as {
      imageUrls: string[];
      condition?: string;
    };

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

    // Input validation
    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No images provided.' }, { status: 400 });
    }

    // Validate image URLs are from our storage
    const validUrlPattern = /^https:\/\/[a-z]+\.supabase\.co\/storage\/v1\/object\/public\//;
    for (const url of imageUrls) {
      if (!validUrlPattern.test(url)) {
        return NextResponse.json(
          { error: 'Invalid image URL. Images must be uploaded through the app.' },
          { status: 400 }
        );
      }
    }

    // Create queue item
    const { data: queueItem, error: insertError } = await supabaseAdmin
      .from('appraisal_queue')
      .insert({
        user_id: user.id,
        image_urls: imageUrls,
        condition,
        status: 'pending',
      })
      .select('id, created_at')
      .single();

    if (insertError || !queueItem) {
      console.error('[Queue] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to queue appraisal' }, { status: 500 });
    }

    console.log('[Queue] Item added:', queueItem.id);

    // Process in background using waitUntil (Vercel feature)
    // This allows us to return immediately while processing continues
    const processPromise = processQueueItem(queueItem.id, user.id, authToken);

    // Use globalThis to access the waitUntil function if available (Vercel Edge)
    // @ts-expect-error - waitUntil is a Vercel-specific global
    if (typeof globalThis.waitUntil === 'function') {
      // @ts-expect-error - waitUntil is a Vercel-specific global
      globalThis.waitUntil(processPromise);
    } else {
      // Fallback: process without waitUntil (will work but may timeout)
      processPromise.catch(err => console.error('[Queue] Background processing error:', err));
    }

    return NextResponse.json({
      success: true,
      queueId: queueItem.id,
      status: 'pending',
      message: 'Appraisal queued for processing',
    });

  } catch (error) {
    console.error('[Queue] Error adding to queue:', error);
    return NextResponse.json(
      { error: 'Failed to add to queue' },
      { status: 500 }
    );
  }
}
