const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(__dirname, '../public/logo.jpeg');
const outputDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');

// iOS app icon sizes
const sizes = [
  { size: 20, scale: 2, filename: 'AppIcon-20x20@2x.png' },
  { size: 20, scale: 3, filename: 'AppIcon-20x20@3x.png' },
  { size: 29, scale: 2, filename: 'AppIcon-29x29@2x.png' },
  { size: 29, scale: 3, filename: 'AppIcon-29x29@3x.png' },
  { size: 40, scale: 2, filename: 'AppIcon-40x40@2x.png' },
  { size: 40, scale: 3, filename: 'AppIcon-40x40@3x.png' },
  { size: 60, scale: 2, filename: 'AppIcon-60x60@2x.png' },
  { size: 60, scale: 3, filename: 'AppIcon-60x60@3x.png' },
  { size: 1024, scale: 1, filename: 'AppIcon-1024x1024@1x.png' },
];

console.log('Generating iOS app icons from:', sourceImage);
console.log('Output directory:', outputDir);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate each size
sizes.forEach(({ size, scale, filename }) => {
  const pixels = size * scale;
  const outputPath = path.join(outputDir, filename);
  
  try {
    // Use sips to resize (macOS built-in)
    execSync(`sips -z ${pixels} ${pixels} "${sourceImage}" --out "${outputPath}" 2>/dev/null`);
    console.log(`✓ Generated ${filename} (${pixels}x${pixels})`);
  } catch (err) {
    console.error(`✗ Failed to generate ${filename}:`, err.message);
  }
});

// Generate Contents.json
const contents = {
  images: [
    { size: "20x20", idiom: "iphone", scale: "2x", filename: "AppIcon-20x20@2x.png" },
    { size: "20x20", idiom: "iphone", scale: "3x", filename: "AppIcon-20x20@3x.png" },
    { size: "29x29", idiom: "iphone", scale: "2x", filename: "AppIcon-29x29@2x.png" },
    { size: "29x29", idiom: "iphone", scale: "3x", filename: "AppIcon-29x29@3x.png" },
    { size: "40x40", idiom: "iphone", scale: "2x", filename: "AppIcon-40x40@2x.png" },
    { size: "40x40", idiom: "iphone", scale: "3x", filename: "AppIcon-40x40@3x.png" },
    { size: "60x60", idiom: "iphone", scale: "2x", filename: "AppIcon-60x60@2x.png" },
    { size: "60x60", idiom: "iphone", scale: "3x", filename: "AppIcon-60x60@3x.png" },
    { size: "1024x1024", idiom: "ios-marketing", scale: "1x", filename: "AppIcon-1024x1024@1x.png" },
  ],
  info: { version: 1, author: "xcode" }
};

const contentsPath = path.join(outputDir, 'Contents.json');
fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2));
console.log('✓ Generated Contents.json');

console.log('\n✅ App icons generated successfully!');
