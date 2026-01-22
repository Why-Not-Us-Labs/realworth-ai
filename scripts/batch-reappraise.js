#!/usr/bin/env node
/**
 * Batch reappraise items for active users
 * Focuses on: Coins, Currency, Jewelry, Books
 * Priority users: Specified emails and users active in the last month
 *
 * Usage: node scripts/batch-reappraise.js [--dry-run] [--limit N]
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI, Type } = require('@google/genai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Parse command line args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 999;

console.log(`
=================================================
  RealWorth.ai Batch Reappraisal Script
  Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update DB)'}
  Limit: ${limit} items
=================================================
`);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Priority users to reappraise
const PRIORITY_EMAILS = [
  'ann.mcnamara01@icloud.com',  // Mom
  // Add more priority emails as needed
];

// Categories to reappraise (including artwork and historically significant items)
const TARGET_CATEGORIES = [
  'Coin', 'Currency', 'Jewelry', 'Book', 'Watch', 'Art',
  'Antique', 'Memorabilia', 'Pottery', 'Porcelain', 'Furniture',
  'Photograph', 'Document', 'Military', 'Stamp', 'Vintage'
];

// Load context files
function loadContext() {
  const contextDir = path.join(__dirname, '../lib/context/numismatics');
  const files = ['QUICK_SCAN.md', 'coins_usa.md', 'paper_usa.md'];

  let context = '';
  for (const file of files) {
    const filePath = path.join(contextDir, file);
    if (fs.existsSync(filePath)) {
      context += `\n\n=== ${file} ===\n` + fs.readFileSync(filePath, 'utf8');
    }
  }
  return context;
}

// Simplified schema for reappraisal (matches the Antiques Roadshow additions)
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    itemName: { type: Type.STRING },
    author: { type: Type.STRING },
    era: { type: Type.STRING },
    category: { type: Type.STRING },
    description: { type: Type.STRING },
    priceRange: {
      type: Type.OBJECT,
      properties: {
        low: { type: Type.NUMBER },
        high: { type: Type.NUMBER }
      },
      required: ['low', 'high']
    },
    reasoning: { type: Type.STRING },
    confidenceScore: { type: Type.NUMBER },
    rarityScore: { type: Type.NUMBER },
    rarityFactors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          factor: { type: Type.STRING },
          score: { type: Type.NUMBER },
          detail: { type: Type.STRING }
        },
        required: ['factor', 'score', 'detail']
      }
    },
    gradeValueTiers: {
      type: Type.OBJECT,
      properties: {
        grades: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              grade: { type: Type.STRING },
              valueRange: {
                type: Type.OBJECT,
                properties: {
                  low: { type: Type.NUMBER },
                  high: { type: Type.NUMBER }
                },
                required: ['low', 'high']
              },
              description: { type: Type.STRING },
              isCurrentEstimate: { type: Type.BOOLEAN }
            },
            required: ['grade', 'valueRange']
          }
        },
        currentEstimatedGrade: { type: Type.STRING },
        gradingNarrative: { type: Type.STRING },
        gradingSystemUsed: { type: Type.STRING }
      },
      required: ['grades', 'currentEstimatedGrade', 'gradingNarrative', 'gradingSystemUsed']
    },
    insuranceValue: {
      type: Type.OBJECT,
      properties: {
        recommended: { type: Type.NUMBER },
        methodology: { type: Type.STRING },
        disclaimer: { type: Type.STRING }
      },
      required: ['recommended', 'methodology', 'disclaimer']
    },
    appraisalImprovements: {
      type: Type.OBJECT,
      properties: {
        suggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              description: { type: Type.STRING },
              impact: { type: Type.STRING },
              reason: { type: Type.STRING },
              areaOfInterest: { type: Type.STRING }
            },
            required: ['type', 'description', 'impact', 'reason']
          }
        },
        canImprove: { type: Type.BOOLEAN },
        potentialValueIncrease: {
          type: Type.OBJECT,
          properties: {
            low: { type: Type.NUMBER },
            high: { type: Type.NUMBER }
          }
        }
      },
      required: ['suggestions', 'canImprove']
    }
  },
  required: ['itemName', 'priceRange', 'reasoning', 'gradeValueTiers', 'insuranceValue', 'appraisalImprovements']
};

// Generate future value predictions
function generateFutureValuePredictions(category, priceRange) {
  const midValue = (priceRange.low + priceRange.high) / 2;

  const categoryRates = {
    'Coin': { appreciation: 0.05, volatility: 0.15 },
    'Currency': { appreciation: 0.06, volatility: 0.12 },
    'Art': { appreciation: 0.07, volatility: 0.25 },
    'Jewelry': { appreciation: 0.04, volatility: 0.15 },
    'Book': { appreciation: 0.03, volatility: 0.20 },
    'Watch': { appreciation: 0.06, volatility: 0.20 },
  };

  const rates = categoryRates[category] || { appreciation: 0.03, volatility: 0.15 };
  const timeframes = [1, 5, 10, 25];

  return timeframes.map(years => {
    const baseGrowth = Math.pow(1 + rates.appreciation, years);
    const timeVolatility = rates.volatility * Math.sqrt(years / 10);

    const multiplierLow = Math.max(0.8, baseGrowth * (1 - timeVolatility));
    const multiplierHigh = baseGrowth * (1 + timeVolatility * 1.5);

    const baseProbability = 85 - (years * 1.4) - (rates.volatility * 15);
    const probability = Math.max(45, Math.min(90, Math.round(baseProbability)));

    return {
      years,
      probability,
      multiplierLow: Math.round(multiplierLow * 100) / 100,
      multiplierHigh: Math.round(multiplierHigh * 100) / 100,
      reasoning: `Based on historical ${category.toLowerCase()} appreciation trends.`
    };
  });
}

async function reappraiseItem(appraisal, context) {
  console.log(`\n  Reappraising: ${appraisal.item_name}`);
  console.log(`    Current: $${appraisal.price_low} - $${appraisal.price_high}`);

  // Get images
  const imageUrls = appraisal.image_urls || [appraisal.image_url];

  const imageParts = [];
  for (const url of imageUrls.slice(0, 4)) {
    if (!url) continue;
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';
      imageParts.push({
        inlineData: { data: base64, mimeType }
      });
    } catch (e) {
      console.log(`    Warning: Failed to fetch image: ${url}`);
    }
  }

  if (imageParts.length === 0) {
    console.log(`    Skipping: No valid images`);
    return null;
  }

  const prompt = `You are an expert appraiser presenting like Antiques Roadshow. Analyze these images and provide a detailed valuation.

IMPORTANT: We help people DISCOVER value - we are NOT a pawn shop trying to lowball!

REFERENCE DATA FOR PRICING:
${context}

CRITICAL RULES:
1. Grade HIGHER not lower - assume the BEST reasonable grade
2. Show value at multiple condition grades (3-6 grades)
3. Include insurance value (20-30% above high estimate)
4. Suggest specific photo improvements with impact
5. Be GENEROUS but honest about potential value
6. Express excitement when you see something valuable!

Current item info:
- Name: ${appraisal.item_name}
- Category: ${appraisal.category}
- Era: ${appraisal.era || 'Unknown'}

Provide a fresh appraisal with complete grade tiers, insurance value, and improvement suggestions.`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { role: 'user', parts: [{ text: prompt }, ...imageParts] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    });

    const responseText = result.text;
    const appraisalData = JSON.parse(responseText.trim());

    console.log(`    NEW Value: $${appraisalData.priceRange.low} - $${appraisalData.priceRange.high}`);
    console.log(`    Insurance: $${appraisalData.insuranceValue?.recommended || 'N/A'}`);
    console.log(`    Grade Tiers: ${appraisalData.gradeValueTiers?.grades?.length || 0} levels`);

    return appraisalData;
  } catch (error) {
    console.log(`    Error: ${error.message}`);
    return null;
  }
}

async function updateAppraisal(appraisalId, appraisalData) {
  const futureValuePredictions = generateFutureValuePredictions(
    appraisalData.category || 'Collectible',
    appraisalData.priceRange
  );

  const updateData = {
    item_name: appraisalData.itemName,
    author: appraisalData.author || null,
    era: appraisalData.era || null,
    category: appraisalData.category,
    description: appraisalData.description || null,
    price_low: appraisalData.priceRange.low,
    price_high: appraisalData.priceRange.high,
    reasoning: appraisalData.reasoning || null,
    confidence_score: appraisalData.confidenceScore || null,
    rarity_score: appraisalData.rarityScore || null,
    rarity_factors: appraisalData.rarityFactors || null,
    future_value_predictions: futureValuePredictions,
    grade_value_tiers: appraisalData.gradeValueTiers || null,
    insurance_value: appraisalData.insuranceValue || null,
    appraisal_improvements: appraisalData.appraisalImprovements || null,
    last_analyzed_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('appraisals')
    .update(updateData)
    .eq('id', appraisalId);

  if (error) {
    throw error;
  }
}

async function main() {
  console.log('Loading numismatic context...');
  const context = loadContext();
  console.log(`  Loaded ${context.length} characters of context\n`);

  // Get priority users
  console.log('Finding priority users...');
  const { data: priorityUsers } = await supabase
    .from('users')
    .select('id, email, name')
    .in('email', PRIORITY_EMAILS);

  const priorityUserIds = (priorityUsers || []).map(u => u.id);
  console.log(`  Found ${priorityUserIds.length} priority users`);

  // Get active users (last month)
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const { data: activeAppraisals } = await supabase
    .from('appraisals')
    .select('user_id')
    .gte('created_at', oneMonthAgo.toISOString());

  const activeUserIds = [...new Set((activeAppraisals || []).map(a => a.user_id))];
  console.log(`  Found ${activeUserIds.length} active users\n`);

  // Combine priority and active user IDs
  const allTargetUserIds = [...new Set([...priorityUserIds, ...activeUserIds])];

  // Get items to reappraise
  console.log('Finding items to reappraise...');
  const categoryFilter = TARGET_CATEGORIES.join(',');

  let query = supabase
    .from('appraisals')
    .select('*')
    .in('user_id', allTargetUserIds)
    .order('created_at', { ascending: false });

  // Filter by categories using ilike for case-insensitive matching
  const categoryConditions = TARGET_CATEGORIES.map(cat => `category.ilike.%${cat}%`).join(',');
  query = query.or(categoryConditions);

  const { data: items, error } = await query.limit(limit);

  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  console.log(`  Found ${items?.length || 0} items matching criteria\n`);

  if (!items || items.length === 0) {
    console.log('No items to reappraise.');
    return;
  }

  // Process items
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`\n[${i + 1}/${items.length}] ${item.item_name}`);
    console.log(`  Category: ${item.category}`);
    console.log(`  User: ${item.user_id.substring(0, 8)}...`);

    try {
      const newAppraisal = await reappraiseItem(item, context);

      if (!newAppraisal) {
        skipCount++;
        continue;
      }

      if (dryRun) {
        console.log(`  [DRY RUN] Would update with new values`);
        successCount++;
      } else {
        await updateAppraisal(item.id, newAppraisal);
        console.log(`  Updated successfully`);
        successCount++;
      }

      // Rate limiting - 2 seconds between API calls
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`  Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`
=================================================
  Batch Reappraisal Complete

  Total Items: ${items.length}
  Successful:  ${successCount}
  Errors:      ${errorCount}
  Skipped:     ${skipCount}

  Mode: ${dryRun ? 'DRY RUN (no changes made)' : 'LIVE'}
=================================================
`);
}

main().catch(console.error);
