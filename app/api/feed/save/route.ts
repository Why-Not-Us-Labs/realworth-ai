import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { socialService } from '@/services/socialService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create authenticated client to verify the user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const { appraisalId } = await request.json();

    if (!appraisalId) {
      return NextResponse.json(
        { error: 'appraisalId is required' },
        { status: 400 }
      );
    }

    const saved = await socialService.toggleSave(user.id, appraisalId);

    return NextResponse.json({ saved });
  } catch (error) {
    console.error('Error toggling save:', error);
    return NextResponse.json(
      { error: 'Failed to toggle save' },
      { status: 500 }
    );
  }
}
