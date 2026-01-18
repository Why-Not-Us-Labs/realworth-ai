import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseAdmin();

  try {
    // Get the start of the current week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Query users with their weekly appraisal stats
    const { data, error } = await supabase
      .from('appraisals')
      .select(`
        user_id,
        price_low,
        price_high,
        users:user_id (id, name, picture, username)
      `)
      .gte('created_at', startOfWeek.toISOString())
      .eq('is_public', true);

    if (error) throw error;

    // Aggregate by user
    const userStats: Record<string, {
      userId: string;
      name: string;
      picture: string;
      username?: string;
      totalValue: number;
      findsCount: number;
    }> = {};

    for (const item of data || []) {
      const userId = item.user_id;
      // Supabase returns the relation as an object for foreign key joins
      const user = item.users as unknown as { id: string; name: string; picture: string; username?: string } | null;

      if (!user) continue;

      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          name: user.name || 'Anonymous',
          picture: user.picture || '',
          username: user.username,
          totalValue: 0,
          findsCount: 0,
        };
      }

      const avgValue = (item.price_low + item.price_high) / 2;
      userStats[userId].totalValue += avgValue;
      userStats[userId].findsCount += 1;
    }

    // Sort by total value and take top 10
    const leaderboard = Object.values(userStats)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return NextResponse.json({
      leaderboard,
      weekStart: startOfWeek.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
