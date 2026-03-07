#!/usr/bin/env node
/**
 * One-time script: Generate a "RealWorth" collab logo using Gemini image generation.
 * Usage: GEMINI_API_KEY=... node scripts/generate-realworth-logo.mjs
 */
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const apiKey = process.env.GEMINI_API_KEY?.replace(/\\n/g, '').trim();
if (!apiKey) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const outputPath = path.join(__dirname, '..', 'public', 'partners', 'realworth-collab-logo.png');

async function main() {
  console.log('Generating RealWorth collab logo via Gemini...');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{
      role: 'user',
      parts: [{
        text: `Generate a logo image with just the text "RealWorth" in a bold, flowing script/cursive font style similar to streetwear/sneaker culture branding. The text should be black colored on a completely white/clear background. The style should complement a partner logo that uses a bold cursive "Bullseye" script with a target/arrow motif. Make it clean, modern, and legible. Output ONLY the logo image, no extra elements or decorations. The text "RealWorth" should be one word with the R and W capitalized.`
      }]
    }],
    generationConfig: {
      responseModalities: ['image', 'text'],
    },
  });

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      fs.writeFileSync(outputPath, buffer);
      console.log(`Saved to ${outputPath} (${buffer.length} bytes)`);
      return;
    }
  }

  console.error('No image generated. Response parts:', parts.map(p => p.text || '[image]'));
}

main().catch(console.error);
