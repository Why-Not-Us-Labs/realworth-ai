import ReactNativeBlobUtil from 'react-native-blob-util';
import { supabase } from './supabase';

const API_BASE_URL = 'https://realworth.ai';

export interface AppraisalResult {
  id: string;
  item_name: string;
  category: string;
  description: string;
  author?: string;
  era?: string;
  price_low: number;
  price_high: number;
  currency: string;
  reasoning: string;
  image_url: string;
  ai_image_url?: string;
  created_at: string;
}

interface AppraisalResponse {
  success: boolean;
  appraisal?: AppraisalResult;
  error?: string;
}

export async function submitAppraisal(imageUri: string): Promise<AppraisalResponse> {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token || !session.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Read the image file and convert to base64
    const base64Data = await ReactNativeBlobUtil.fs.readFile(imageUri, 'base64');

    // Determine mime type from URI
    const extension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

    // Step 1: Upload image to Supabase Storage
    console.log('Uploading image to storage...');
    const { url: imageUrl, path: imagePath } = await supabase.storage.uploadImage(
      base64Data,
      session.user.id,
      mimeType
    );
    console.log('Image uploaded:', imageUrl);

    // Step 2: Submit to the API with storage URL
    const response = await fetch(`${API_BASE_URL}/api/appraise`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        imageUrls: [imageUrl],
        imagePaths: [imagePath],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || errorData.message || `Request failed with status ${response.status}`
      };
    }

    const data = await response.json();

    // Map API response to our AppraisalResult format
    const appraisalData = data.appraisalData || data;
    return {
      success: true,
      appraisal: {
        id: data.id || `temp-${Date.now()}`,
        item_name: appraisalData.itemName,
        category: appraisalData.category,
        description: appraisalData.description,
        author: appraisalData.author,
        era: appraisalData.era,
        price_low: appraisalData.priceRange?.low || 0,
        price_high: appraisalData.priceRange?.high || 0,
        currency: appraisalData.currency || 'USD',
        reasoning: appraisalData.reasoning,
        image_url: imageUrl,
        ai_image_url: data.imageDataUrl,
        created_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Appraisal submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit appraisal',
    };
  }
}

export async function getAppraisal(id: string): Promise<AppraisalResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE_URL}/api/appraise/${id}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch appraisal' };
    }

    const data = await response.json();
    return {
      success: true,
      appraisal: data.appraisal,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch appraisal',
    };
  }
}
