#!/usr/bin/env node
/**
 * One-time script: Remove white background from Bullseye logo screenshot.
 * Usage: node scripts/process-bullseye-logo.mjs <input-path>
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/process-bullseye-logo.mjs <input-image-path>');
  process.exit(1);
}

const outputPath = path.join(__dirname, '..', 'public', 'partners', 'bullseye-logo.png');

async function main() {
  // Load the image and get raw pixel data
  const image = sharp(inputPath);
  const { width, height, channels } = await image.metadata();

  // Ensure we have an alpha channel
  const rawBuffer = await image.ensureAlpha().raw().toBuffer();
  const pixels = new Uint8Array(rawBuffer);

  // Convert white/near-white pixels to transparent
  const threshold = 230; // pixels with R,G,B all above this become transparent
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r > threshold && g > threshold && b > threshold) {
      pixels[i + 3] = 0; // set alpha to 0
    }
  }

  // Write back with transparency, trim whitespace, then save
  await sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
    .trim()
    .png()
    .toFile(outputPath);

  console.log(`Saved transparent logo to ${outputPath}`);
}

main().catch(console.error);
