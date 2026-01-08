#!/usr/bin/env node
/**
 * Generate iOS app icons from SVG source
 * Run with: node scripts/generate-app-icons.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// iOS icon sizes needed
const ICON_SIZES = [
  { size: 20, scales: [2, 3] },
  { size: 29, scales: [2, 3] },
  { size: 40, scales: [2, 3] },
  { size: 60, scales: [2, 3] },
  { size: 1024, scales: [1] }, // App Store
];

const SOURCE_SVG = path.join(__dirname, '../../public/logo.svg');
const OUTPUT_DIR = path.join(__dirname, '../ios/RealWorthApp/Images.xcassets/AppIcon.appiconset');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Check if we have sharp installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Installing sharp for image processing...');
  execSync('npm install sharp', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  sharp = require('sharp');
}

async function generateIcons() {
  console.log('Reading SVG from:', SOURCE_SVG);

  // Read the SVG file
  const svgBuffer = fs.readFileSync(SOURCE_SVG);

  // Generate each icon size
  const contents = {
    images: [],
    info: {
      author: 'xcode',
      version: 1
    }
  };

  for (const { size, scales } of ICON_SIZES) {
    for (const scale of scales) {
      const pixelSize = size * scale;
      const filename = size === 1024
        ? 'icon-1024.png'
        : `icon-${size}@${scale}x.png`;
      const outputPath = path.join(OUTPUT_DIR, filename);

      console.log(`Generating ${filename} (${pixelSize}x${pixelSize}px)...`);

      // Create a white background with the icon centered
      // App Store requires no transparency
      await sharp({
        create: {
          width: pixelSize,
          height: pixelSize,
          channels: 4,
          background: { r: 248, g: 250, b: 252, alpha: 1 } // #F8FAFC - same as app background
        }
      })
        .composite([{
          input: await sharp(svgBuffer)
            .resize(Math.round(pixelSize * 0.75), Math.round(pixelSize * 0.75)) // Icon takes 75% of space
            .toBuffer(),
          gravity: 'center'
        }])
        .png()
        .toFile(outputPath);

      // Add to Contents.json
      const entry = {
        filename,
        idiom: 'universal',
        platform: 'ios',
        size: `${size}x${size}`
      };

      if (scale > 1) {
        entry.scale = `${scale}x`;
      }

      contents.images.push(entry);
    }
  }

  // Write Contents.json
  const contentsPath = path.join(OUTPUT_DIR, 'Contents.json');
  fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2));

  console.log('\nApp icons generated successfully!');
  console.log('Output directory:', OUTPUT_DIR);
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
