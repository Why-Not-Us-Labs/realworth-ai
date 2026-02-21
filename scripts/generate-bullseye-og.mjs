/**
 * Generate Bullseye OG images using sharp.
 *
 * Produces:
 *   public/partners/bullseye-og.png          — customer portal ("Free Appraisal")
 *   public/partners/bullseye-dashboard-og.png — dashboard ("Dashboard")
 *
 * Usage: node scripts/generate-bullseye-og.mjs
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PARTNERS_DIR = path.join(__dirname, '..', 'public', 'partners');

const WIDTH = 1200;
const HEIGHT = 630;

async function generateOG({ outputName, headline, subtext }) {
  const bullseyeLogo = path.join(PARTNERS_DIR, 'bullseye-logo.png');
  const realworthLogo = path.join(PARTNERS_DIR, 'realworth-collab-logo.png');

  // Resize logos to fit
  const bLogo = await sharp(bullseyeLogo).resize({ height: 60, fit: 'inside' }).toBuffer();
  const rLogo = await sharp(realworthLogo).resize({ height: 60, fit: 'inside' }).toBuffer();

  const bMeta = await sharp(bLogo).metadata();
  const rMeta = await sharp(rLogo).metadata();

  // "x" separator rendered as SVG
  const xSvg = Buffer.from(`<svg width="30" height="60"><text x="15" y="45" font-family="Arial" font-size="28" fill="#94a3b8" text-anchor="middle">x</text></svg>`);

  // Calculate centered positions for logos
  const totalLogosWidth = (bMeta.width || 200) + 30 + (rMeta.width || 150);
  const logosStartX = Math.round((WIDTH - totalLogosWidth) / 2);
  const logosY = 160;

  // Headline SVG
  const headlineSvg = Buffer.from(
    `<svg width="${WIDTH}" height="100">
      <text x="${WIDTH / 2}" y="70" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="bold" fill="#0f172a" text-anchor="middle">${headline}</text>
    </svg>`
  );

  // Subtext SVG
  const subtextSvg = Buffer.from(
    `<svg width="${WIDTH}" height="60">
      <text x="${WIDTH / 2}" y="40" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#64748b" text-anchor="middle">${subtext}</text>
    </svg>`
  );

  // Powered by line
  const poweredSvg = Buffer.from(
    `<svg width="${WIDTH}" height="40">
      <text x="${WIDTH / 2}" y="28" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">Powered by AI</text>
    </svg>`
  );

  const composites = [
    { input: bLogo, top: logosY, left: logosStartX },
    { input: xSvg, top: logosY, left: logosStartX + (bMeta.width || 200) },
    { input: rLogo, top: logosY, left: logosStartX + (bMeta.width || 200) + 30 },
    { input: headlineSvg, top: 280, left: 0 },
    { input: subtextSvg, top: 370, left: 0 },
    { input: poweredSvg, top: 440, left: 0 },
  ];

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(PARTNERS_DIR, outputName));

  console.log(`Generated: public/partners/${outputName}`);
}

async function main() {
  await generateOG({
    outputName: 'bullseye-og.png',
    headline: 'Free Sneaker Appraisal',
    subtext: 'Get an instant cash offer for your sneakers',
  });

  await generateOG({
    outputName: 'bullseye-dashboard-og.png',
    headline: 'Partner Dashboard',
    subtext: 'Manage appraisals and buy offers',
  });

  console.log('Done!');
}

main().catch(console.error);
