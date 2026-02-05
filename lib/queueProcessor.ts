import { GoogleGenAI, Type, Modality } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

function getSupabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('Missing Supabase anon key');
  return key;
}

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('Missing Supabase URL');
  return url;
}

// Response schema for Gemini
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    itemName: { type: Type.STRING, description: "The title of the book or a concise name for the item." },
    author: { type: Type.STRING, description: "The author of the book. If not a book or not visible, state 'N/A'." },
    era: { type: Type.STRING, description: "The publication year of the book (e.g., '1924') or the estimated time period of the item (e.g., 'c. 1920s')." },
    category: { type: Type.STRING, description: "A single-word category for the item (e.g., 'Book', 'Painting', 'Tool', 'Record', 'Toy', 'Collectible')." },
    description: { type: Type.STRING, description: "A brief summary of the book's content or a physical description of the item." },
    priceRange: {
      type: Type.OBJECT,
      properties: {
        low: { type: Type.NUMBER, description: "The low end of the estimated value range as a number." },
        high: { type: Type.NUMBER, description: "The high end of the estimated value range as a number." }
      },
      required: ["low", "high"]
    },
    currency: { type: Type.STRING, description: "The currency for the price range, e.g., USD." },
    reasoning: { type: Type.STRING, description: "A step-by-step explanation of how the value was determined." },
    references: {
      type: Type.ARRAY,
      description: "Reference sources used to determine the price range.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A descriptive title for the reference source." },
          url: { type: Type.STRING, description: "The URL to the reference source." }
        },
        required: ["title", "url"]
      }
    },
  },
  required: ["itemName", "author", "era", "category", "description", "priceRange", "currency", "reasoning", "references"]
};

/**
 * Process a single queue item - called from background
 */
export async function processQueueItem(
  queueId: string,
  userId: string,
  authToken: string
): Promise<void> {
  console.log(`[Queue] Processing item ${queueId}`);

  // Get clients lazily
  const supabaseAdmin = getSupabaseAdmin();
  const ai = getAI();

  try {
    // Mark as processing
    await supabaseAdmin
      .from('appraisal_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    // Get queue item details
    const { data: queueItem, error: fetchError } = await supabaseAdmin
      .from('appraisal_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (fetchError || !queueItem) {
      throw new Error('Queue item not found');
    }

    const { image_urls: imageUrls, condition } = queueItem;

    // Fetch images and convert to base64
    const imageParts = await Promise.all(imageUrls.map(async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${url}`);
      }
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return {
        inlineData: {
          data: Buffer.from(buffer).toString('base64'),
          mimeType: contentType,
        },
      };
    }));

    // Step 1: Get appraisal from Gemini
    const appraisalSystemInstruction = `You are an expert appraiser and archivist named 'RealWorth.ai'. Your task is to analyze images of an item and provide a detailed appraisal in a structured JSON format. If the item is a book, prioritize extracting its title, author, and publication year. Use the title for 'itemName', the author for 'author', and the year for 'era'. The 'description' should be a summary of the book. For other items, provide a descriptive name, era, and physical description. You must also determine a single-word 'category'. Provide an estimated market value and a rationale based on the item's details and its visual condition provided by the user. IMPORTANT: You must also provide 2-4 references with real URLs to external marketplaces (e.g., eBay, AbeBooks, Amazon, Heritage Auctions, Sotheby's, Christie's) or price guides that support your valuation.`;
    const appraisalTextPart = { text: `User-specified Condition: ${condition}` };

    const appraisalResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { role: 'user', parts: [...imageParts, appraisalTextPart] },
      config: {
        systemInstruction: appraisalSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    if (!appraisalResponse.text) {
      throw new Error('No text response from AI');
    }
    const appraisalData = JSON.parse(appraisalResponse.text.trim());

    // Step 2: Regenerate image
    const imageRegenTextPart = { text: "Regenerate this image exactly as it is, without any changes." };
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { role: 'user', parts: [...imageParts, imageRegenTextPart] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    let imageBuffer: Buffer | null = null;
    let imageMimeType: string | null = null;

    if (imageResponse.candidates?.[0]?.content?.parts) {
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData?.data && part.inlineData?.mimeType) {
          imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          imageMimeType = part.inlineData.mimeType;
          break;
        }
      }
    }

    if (!appraisalData || !imageBuffer || !imageMimeType) {
      throw new Error('AI response was incomplete');
    }

    // Step 3: Upload result image to storage
    let imageDataUrl: string = imageUrls[0]; // Fallback
    let imagePath: string | undefined;

    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileExt = imageMimeType.split('/')[1] || 'png';
      const fileName = `result-${timestamp}-${randomStr}.${fileExt}`;
      const filePath = `${userId}/results/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('appraisal-images')
        .upload(filePath, imageBuffer, {
          contentType: imageMimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (!uploadError) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('appraisal-images')
          .getPublicUrl(filePath);
        imageDataUrl = publicUrl;
        imagePath = filePath;
      }
    } catch {
      console.warn('[Queue] Using original image as fallback');
    }

    // Step 4: Save appraisal to database
    const { data: savedAppraisal, error: saveError } = await supabaseAdmin
      .from('appraisals')
      .insert({
        user_id: userId,
        item_name: appraisalData.itemName,
        author: appraisalData.author,
        era: appraisalData.era,
        category: appraisalData.category,
        description: appraisalData.description,
        price_low: appraisalData.priceRange.low,
        price_high: appraisalData.priceRange.high,
        currency: appraisalData.currency,
        reasoning: appraisalData.reasoning,
        references: appraisalData.references,
        ai_image_url: imageDataUrl,
        image_urls: imageUrls,
      })
      .select('id')
      .single();

    if (saveError) {
      throw new Error(`Failed to save appraisal: ${saveError.message}`);
    }

    // Step 5: Update user streak
    try {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('current_streak, longest_streak, last_appraisal_date')
        .eq('id', userId)
        .single();

      if (userData) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        let currentStreak = userData.current_streak || 0;
        let longestStreak = userData.longest_streak || 0;

        if (!userData.last_appraisal_date) {
          currentStreak = 1;
        } else {
          const lastDate = new Date(userData.last_appraisal_date);
          lastDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff === 0) {
            // Same day - no change
          } else if (daysDiff === 1) {
            currentStreak += 1;
          } else {
            currentStreak = 1;
          }
        }

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }

        await supabaseAdmin
          .from('users')
          .update({
            current_streak: currentStreak,
            longest_streak: longestStreak,
            last_appraisal_date: todayStr,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
    } catch (streakError) {
      console.error('[Queue] Streak update failed:', streakError);
    }

    // Step 6: Mark queue item as completed
    await supabaseAdmin
      .from('appraisal_queue')
      .update({
        status: 'completed',
        result: appraisalData,
        appraisal_id: savedAppraisal?.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    console.log(`[Queue] Item ${queueId} completed successfully`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Queue] Item ${queueId} failed:`, errorMessage);

    // Mark as failed
    await supabaseAdmin
      .from('appraisal_queue')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', queueId);
  }
}
