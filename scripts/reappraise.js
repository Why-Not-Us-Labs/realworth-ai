#!/usr/bin/env node
/**
 * Reappraise an existing item with updated context
 * Usage: node scripts/reappraise.js <appraisal_id>
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

// Generate future value predictions
function generateFutureValuePredictions(category, priceRange) {
  const midValue = (priceRange.low + priceRange.high) / 2;

  const categoryRates = {
    'Coins': { appreciation: 0.05, volatility: 0.15 },
    'Currency': { appreciation: 0.06, volatility: 0.12 },
    'Art': { appreciation: 0.07, volatility: 0.25 },
    'Collectibles': { appreciation: 0.04, volatility: 0.20 },
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

async function reappraise(appraisalId) {
  console.log('Loading appraisal:', appraisalId);

  // Get the appraisal
  const { data: appraisal, error } = await supabase
    .from('appraisals')
    .select('*')
    .eq('id', appraisalId)
    .single();

  if (error || !appraisal) {
    console.error('Error fetching appraisal:', error);
    return;
  }

  console.log('Current item:', appraisal.item_name);
  console.log('Current value:', `$${appraisal.price_low} - $${appraisal.price_high}`);

  // Get images
  const imageUrls = appraisal.image_urls || [appraisal.image_url];
  console.log('Fetching', imageUrls.length, 'images...');

  const imageParts = [];
  for (const url of imageUrls.slice(0, 4)) {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';
      imageParts.push({
        inlineData: { data: base64, mimeType }
      });
    } catch (e) {
      console.log('Failed to fetch image:', url);
    }
  }

  console.log('Loaded', imageParts.length, 'images');

  // Load context
  const numismaticContext = loadContext();

  // Build prompt
  const prompt = `You are an expert appraiser. Analyze these images and provide a detailed valuation.

IMPORTANT REFERENCE DATA FOR PRICING:
${numismaticContext}

Provide your response as JSON with this exact structure:
{
  "itemName": "Full item name with date/series",
  "author": "Signatures or maker if applicable",
  "era": "Date/series/period",
  "category": "Currency|Coins|Art|Collectibles|etc",
  "description": "Detailed description",
  "priceRange": { "low": number, "high": number },
  "currency": "USD",
  "reasoning": "Detailed valuation rationale with condition assessment",
  "confidenceScore": number (0-100),
  "rarityScore": number (0-10),
  "rarityFactors": [{ "factor": "name", "score": number, "detail": "explanation" }]
}

Be generous but accurate with valuations. Use the reference data provided for pricing guidance.`;

  console.log('Calling Gemini API...');

  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ parts: [{ text: prompt }, ...imageParts] }]
  });
  const responseText = result.text;

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Failed to parse JSON from response');
    console.log('Response:', responseText);
    return;
  }

  const appraisalData = JSON.parse(jsonMatch[0]);

  console.log('\n=== NEW APPRAISAL ===');
  console.log('Item:', appraisalData.itemName);
  console.log('NEW Value:', `$${appraisalData.priceRange.low} - $${appraisalData.priceRange.high}`);
  console.log('Confidence:', appraisalData.confidenceScore);
  console.log('Rarity:', appraisalData.rarityScore);

  // Generate future value predictions
  const futureValuePredictions = generateFutureValuePredictions(
    appraisalData.category,
    appraisalData.priceRange
  );

  console.log('\nFuture Value Predictions:');
  futureValuePredictions.forEach(p => {
    const midValue = (appraisalData.priceRange.low + appraisalData.priceRange.high) / 2;
    console.log(`  ${p.years}yr: $${Math.round(midValue * p.multiplierLow)} - $${Math.round(midValue * p.multiplierHigh)} (${p.probability}% confidence)`);
  });

  // Update database
  console.log('\nUpdating database...');

  const { error: updateError } = await supabase
    .from('appraisals')
    .update({
      item_name: appraisalData.itemName,
      author: appraisalData.author,
      era: appraisalData.era,
      category: appraisalData.category,
      description: appraisalData.description,
      price_low: appraisalData.priceRange.low,
      price_high: appraisalData.priceRange.high,
      reasoning: appraisalData.reasoning,
      confidence_score: appraisalData.confidenceScore,
      rarity_score: appraisalData.rarityScore,
      rarity_factors: appraisalData.rarityFactors,
      future_value_predictions: futureValuePredictions,
      last_analyzed_at: new Date().toISOString()
    })
    .eq('id', appraisalId);

  if (updateError) {
    console.error('Error updating:', updateError);
  } else {
    console.log('Successfully updated appraisal!');
  }
}

// Run
const appraisalId = process.argv[2] || '3afcb23e-5896-4765-8a72-f6ec5f2eff33';
reappraise(appraisalId).catch(console.error);
