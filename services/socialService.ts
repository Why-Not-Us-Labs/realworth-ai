import { getSupabaseAdmin } from '@/lib/supabase';

export type Like = {
  id: string;
  user_id: string;
  appraisal_id: string;
  created_at: string;
};

export type Save = {
  id: string;
  user_id: string;
  appraisal_id: string;
  created_at: string;
};

class SocialService {
  /**
   * Toggle like on an appraisal
   * Returns the new liked state
   */
  async toggleLike(userId: string, appraisalId: string): Promise<{ liked: boolean; likeCount: number }> {
    const supabase = getSupabaseAdmin();

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('appraisal_id', appraisalId)
      .single();

    if (existingLike) {
      // Unlike - remove the like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('appraisal_id', appraisalId);

      if (error) {
        console.error('Error removing like:', error);
        throw error;
      }

      // Get updated count
      const { data: appraisal } = await supabase
        .from('appraisals')
        .select('like_count')
        .eq('id', appraisalId)
        .single();

      return { liked: false, likeCount: appraisal?.like_count ?? 0 };
    } else {
      // Like - add the like
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: userId, appraisal_id: appraisalId });

      if (error) {
        console.error('Error adding like:', error);
        throw error;
      }

      // Get updated count
      const { data: appraisal } = await supabase
        .from('appraisals')
        .select('like_count')
        .eq('id', appraisalId)
        .single();

      return { liked: true, likeCount: appraisal?.like_count ?? 0 };
    }
  }

  /**
   * Toggle save on an appraisal
   * Returns the new saved state
   */
  async toggleSave(userId: string, appraisalId: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('saves')
      .select('id')
      .eq('user_id', userId)
      .eq('appraisal_id', appraisalId)
      .single();

    if (existingSave) {
      // Unsave - remove the save
      const { error } = await supabase
        .from('saves')
        .delete()
        .eq('user_id', userId)
        .eq('appraisal_id', appraisalId);

      if (error) {
        console.error('Error removing save:', error);
        throw error;
      }

      return false;
    } else {
      // Save - add the save
      const { error } = await supabase
        .from('saves')
        .insert({ user_id: userId, appraisal_id: appraisalId });

      if (error) {
        console.error('Error adding save:', error);
        throw error;
      }

      return true;
    }
  }

  /**
   * Get which appraisals the user has liked from a list of IDs
   */
  async getUserLikedIds(userId: string, appraisalIds: string[]): Promise<string[]> {
    if (appraisalIds.length === 0) return [];

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('likes')
      .select('appraisal_id')
      .eq('user_id', userId)
      .in('appraisal_id', appraisalIds);

    if (error) {
      console.error('Error fetching user likes:', error);
      return [];
    }

    return data?.map(l => l.appraisal_id) ?? [];
  }

  /**
   * Get which appraisals the user has saved from a list of IDs
   */
  async getUserSavedIds(userId: string, appraisalIds: string[]): Promise<string[]> {
    if (appraisalIds.length === 0) return [];

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('saves')
      .select('appraisal_id')
      .eq('user_id', userId)
      .in('appraisal_id', appraisalIds);

    if (error) {
      console.error('Error fetching user saves:', error);
      return [];
    }

    return data?.map(s => s.appraisal_id) ?? [];
  }

  /**
   * Get all saved appraisals for a user with pagination
   */
  async getUserSaves(
    userId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<{ saves: Save[]; nextCursor?: string }> {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('saves')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user saves:', error);
      return { saves: [] };
    }

    const saves = data ?? [];
    const hasMore = saves.length > limit;

    if (hasMore) {
      saves.pop(); // Remove the extra item
    }

    return {
      saves,
      nextCursor: hasMore ? saves[saves.length - 1]?.created_at : undefined,
    };
  }

  /**
   * Get like count for an appraisal
   */
  async getLikeCount(appraisalId: string): Promise<number> {
    const supabase = getSupabaseAdmin();

    const { data } = await supabase
      .from('appraisals')
      .select('like_count')
      .eq('id', appraisalId)
      .single();

    return data?.like_count ?? 0;
  }
}

// Singleton export
export const socialService = new SocialService();
