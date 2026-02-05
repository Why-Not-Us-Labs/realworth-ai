import { Collection, CollectionSummary, CollectionVisibility, AppraisalResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';

class CollectionService {
  /**
   * Generate a unique share token for unlisted collections
   */
  private generateShareToken(): string {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  }

  /**
   * Create a new collection
   */
  public async createCollection(
    userId: string,
    data: {
      name: string;
      description?: string;
      category?: string;
      expectedCount?: number;
      expectedItems?: string[];
      visibility?: CollectionVisibility;
      goalDate?: string;
    }
  ): Promise<Collection | null> {
    try {
      const shareToken = data.visibility === 'unlisted' ? this.generateShareToken() : null;

      const { data: collection, error } = await supabase
        .from('collections')
        .insert([{
          user_id: userId,
          name: data.name,
          description: data.description || null,
          category: data.category || null,
          expected_count: data.expectedCount || null,
          expected_items: data.expectedItems || [],
          visibility: data.visibility || 'private',
          share_token: shareToken,
          goal_date: data.goalDate || null,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating collection:', error);
        throw error;
      }

      return this.mapCollectionFromDb(collection);
    } catch (error) {
      console.error('Error in createCollection:', error);
      return null;
    }
  }

  /**
   * Get all collections for a user
   * Optimized: Single query for all collection items instead of N+1
   */
  public async getCollections(userId: string): Promise<CollectionSummary[]> {
    try {
      const { data: collections, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching collections:', error);
        throw error;
      }

      if (!collections || collections.length === 0) {
        return [];
      }

      // Get all collection IDs
      const collectionIds = collections.map(c => c.id);

      // OPTIMIZED: Single query to get all items for all collections
      const { data: allItems } = await supabase
        .from('appraisals')
        .select('collection_id, price_low, price_high, image_url, created_at')
        .in('collection_id', collectionIds)
        .order('created_at', { ascending: true });

      // Group items by collection_id using a Map for O(n) performance
      const itemsByCollection = new Map<string, typeof allItems>();
      for (const item of allItems || []) {
        const existing = itemsByCollection.get(item.collection_id) || [];
        existing.push(item);
        itemsByCollection.set(item.collection_id, existing);
      }

      // Build summaries with pre-fetched data
      const summaries: CollectionSummary[] = collections.map(collection => {
        const items = itemsByCollection.get(collection.id) || [];
        const itemCount = items.length;
        const totalValueLow = items.reduce((sum, item) => sum + Number(item.price_low), 0);
        const totalValueHigh = items.reduce((sum, item) => sum + Number(item.price_high), 0);
        const thumbnailUrl = items[0]?.image_url || undefined;

        return {
          id: collection.id,
          name: collection.name,
          description: collection.description,
          category: collection.category,
          itemCount,
          expectedCount: collection.expected_count,
          completionPercentage: collection.expected_count
            ? Math.round((itemCount / collection.expected_count) * 100)
            : 0,
          totalValueLow,
          totalValueHigh,
          visibility: collection.visibility,
          goalDate: collection.goal_date,
          thumbnailUrl,
        };
      });

      return summaries;
    } catch (error) {
      console.error('Error in getCollections:', error);
      return [];
    }
  }

  /**
   * Get a single collection with all its items
   */
  public async getCollection(collectionId: string, userId?: string): Promise<Collection | null> {
    try {
      let query = supabase
        .from('collections')
        .select('*')
        .eq('id', collectionId);

      // If userId provided, ensure they own it or it's public/unlisted
      if (userId) {
        query = query.or(`user_id.eq.${userId},visibility.eq.public,visibility.eq.unlisted`);
      }

      const { data: collection, error } = await query.single();

      if (error) {
        console.error('Error fetching collection:', error);
        return null;
      }

      // Get all items in the collection
      const { data: items } = await supabase
        .from('appraisals')
        .select('*')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: true });

      const mappedCollection = this.mapCollectionFromDb(collection);

      // Add items and computed values
      mappedCollection.items = (items || []).map(item => ({
        id: item.id,
        itemName: item.item_name,
        author: item.author || '',
        era: item.era || '',
        category: item.category,
        description: item.description || '',
        priceRange: {
          low: Number(item.price_low),
          high: Number(item.price_high),
        },
        currency: item.currency,
        reasoning: item.reasoning || '',
        references: item.references || [],
        image: item.image_url || '',
        images: item.image_urls || [],
        timestamp: new Date(item.created_at).getTime(),
        isPublic: item.is_public || false,
        collectionId: item.collection_id,
        seriesIdentifier: item.series_identifier,
        validationStatus: item.validation_status,
        validationNotes: item.validation_notes,
      }));

      mappedCollection.itemCount = mappedCollection.items.length;
      mappedCollection.totalValueLow = mappedCollection.items.reduce(
        (sum, item) => sum + item.priceRange.low, 0
      );
      mappedCollection.totalValueHigh = mappedCollection.items.reduce(
        (sum, item) => sum + item.priceRange.high, 0
      );

      return mappedCollection;
    } catch (error) {
      console.error('Error in getCollection:', error);
      return null;
    }
  }

  /**
   * Get a collection by share token (for unlisted sharing)
   */
  public async getCollectionByShareToken(shareToken: string): Promise<Collection | null> {
    try {
      const { data: collection, error } = await supabase
        .from('collections')
        .select('*')
        .eq('share_token', shareToken)
        .eq('visibility', 'unlisted')
        .single();

      if (error) {
        console.error('Error fetching collection by share token:', error);
        return null;
      }

      // Get all items
      const { data: items } = await supabase
        .from('appraisals')
        .select('*')
        .eq('collection_id', collection.id)
        .order('created_at', { ascending: true });

      const mappedCollection = this.mapCollectionFromDb(collection);
      mappedCollection.items = (items || []).map(item => ({
        id: item.id,
        itemName: item.item_name,
        author: item.author || '',
        era: item.era || '',
        category: item.category,
        description: item.description || '',
        priceRange: {
          low: Number(item.price_low),
          high: Number(item.price_high),
        },
        currency: item.currency,
        reasoning: item.reasoning || '',
        references: item.references || [],
        image: item.image_url || '',
        images: item.image_urls || [],
        timestamp: new Date(item.created_at).getTime(),
        isPublic: item.is_public || false,
      }));

      mappedCollection.itemCount = mappedCollection.items.length;
      mappedCollection.totalValueLow = mappedCollection.items.reduce(
        (sum, item) => sum + item.priceRange.low, 0
      );
      mappedCollection.totalValueHigh = mappedCollection.items.reduce(
        (sum, item) => sum + item.priceRange.high, 0
      );

      return mappedCollection;
    } catch (error) {
      console.error('Error in getCollectionByShareToken:', error);
      return null;
    }
  }

  /**
   * Update a collection
   */
  public async updateCollection(
    userId: string,
    collectionId: string,
    data: Partial<{
      name: string;
      description: string;
      category: string;
      expectedCount: number;
      expectedItems: string[];
      visibility: CollectionVisibility;
      goalDate: string;
    }>
  ): Promise<Collection | null> {
    try {
      const updateData: Record<string, unknown> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.expectedCount !== undefined) updateData.expected_count = data.expectedCount;
      if (data.expectedItems !== undefined) updateData.expected_items = data.expectedItems;
      if (data.goalDate !== undefined) updateData.goal_date = data.goalDate;

      if (data.visibility !== undefined) {
        updateData.visibility = data.visibility;
        // Generate share token if switching to unlisted
        if (data.visibility === 'unlisted') {
          const { data: existing } = await supabase
            .from('collections')
            .select('share_token')
            .eq('id', collectionId)
            .single();

          if (!existing?.share_token) {
            updateData.share_token = this.generateShareToken();
          }
        }
      }

      const { data: collection, error } = await supabase
        .from('collections')
        .update(updateData)
        .eq('id', collectionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating collection:', error);
        throw error;
      }

      return this.mapCollectionFromDb(collection);
    } catch (error) {
      console.error('Error in updateCollection:', error);
      return null;
    }
  }

  /**
   * Delete a collection (items are kept but unlinked)
   */
  public async deleteCollection(userId: string, collectionId: string): Promise<boolean> {
    try {
      // First unlink all appraisals
      await supabase
        .from('appraisals')
        .update({ collection_id: null, series_identifier: null, validation_status: null, validation_notes: null })
        .eq('collection_id', collectionId);

      // Then delete the collection
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting collection:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteCollection:', error);
      return false;
    }
  }

  /**
   * Add an appraisal to a collection
   */
  public async addToCollection(
    userId: string,
    appraisalId: string,
    collectionId: string,
    seriesIdentifier?: string,
    validationStatus?: string,
    validationNotes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('appraisals')
        .update({
          collection_id: collectionId,
          series_identifier: seriesIdentifier || null,
          validation_status: validationStatus || null,
          validation_notes: validationNotes || null,
        })
        .eq('id', appraisalId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error adding to collection:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addToCollection:', error);
      return false;
    }
  }

  /**
   * Remove an appraisal from a collection
   */
  public async removeFromCollection(userId: string, appraisalId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('appraisals')
        .update({
          collection_id: null,
          series_identifier: null,
          validation_status: null,
          validation_notes: null,
        })
        .eq('id', appraisalId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing from collection:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeFromCollection:', error);
      return false;
    }
  }

  /**
   * Get items not in any collection (for adding to collections)
   */
  public async getUnassignedAppraisals(userId: string): Promise<AppraisalResult[]> {
    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select('*')
        .eq('user_id', userId)
        .is('collection_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching unassigned appraisals:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        itemName: item.item_name,
        author: item.author || '',
        era: item.era || '',
        category: item.category,
        description: item.description || '',
        priceRange: {
          low: Number(item.price_low),
          high: Number(item.price_high),
        },
        currency: item.currency,
        reasoning: item.reasoning || '',
        references: item.references || [],
        image: item.image_url || '',
        images: item.image_urls || [],
        timestamp: new Date(item.created_at).getTime(),
        isPublic: item.is_public || false,
      }));
    } catch (error) {
      console.error('Error in getUnassignedAppraisals:', error);
      return [];
    }
  }

  /**
   * Map database record to Collection type
   */
  private mapCollectionFromDb(record: Record<string, unknown>): Collection {
    return {
      id: record.id as string,
      userId: record.user_id as string,
      name: record.name as string,
      description: record.description as string | undefined,
      category: record.category as string | undefined,
      expectedCount: record.expected_count as number | undefined,
      expectedItems: record.expected_items as string[] | undefined,
      visibility: record.visibility as CollectionVisibility,
      shareToken: record.share_token as string | undefined,
      goalDate: record.goal_date as string | undefined,
      createdAt: new Date(record.created_at as string).getTime(),
      updatedAt: new Date(record.updated_at as string).getTime(),
    };
  }
}

export const collectionService = new CollectionService();
