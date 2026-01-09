const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(__dirname, '../public/logo.jpeg');
const outputDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');

// All iOS app icon sizes with unique filenames
const sizes = [
  // iPhone
  { size: 20, scale: 2, idiom: 'iphone', filename: 'Icon-App-20x20@2x.png' },
  { size: 20, scale: 3, idiom: 'iphone', filename: 'Icon-App-20x20@3x.png' },
  { size: 29, scale: 2, idiom: 'iphone', filename: 'Icon-App-29x29@2x.png' },
  { size: 29, scale: 3, idiom: 'iphone', filename: 'Icon-App-29x29@3x.png' },
  { size: 40, scale: 2, idiom: 'iphone', filename: 'Icon-App-40x40@2x.png' },
  { size: 40, scale: 3, idiom: 'iphone', filename: 'Icon-App-40x40@3x.png' },
  { size: 60, scale: 2, idiom: 'iphone', filename: 'Icon-App-60x60@2x.png' },
  { size: 60, scale: 3, idiom: 'iphone', filename: 'Icon-App-60x60@3x.png' },
  // iPad
  { size: 20, scale: 1, idiom: 'ipad', filename: 'Icon-App-20x20@1x-ipad.png' },
  { size: 20, scale: 2, idiom: 'ipad', filename: 'Icon-App-20x20@2x-ipad.png' },
  { size: 29, scale: 1, idiom: 'ipad', filename: 'Icon-App-29x29@1x-ipad.png' },
  { size: 29, scale: 2, idiom: 'ipad', filename: 'Icon-App-29x29@2x-ipad.png' },
  { size: 40, scale: 1, idiom: 'ipad', filename: 'Icon-App-40x40@1x-ipad.png' },
  { size: 40, scale: 2, idiom: 'ipad', filename: 'Icon-App-40x40@2x-ipad.png' },
  { size: 76, scale: 1, idiom: 'ipad', filename: 'Icon-App-76x76@1x.png' },
  { size: 76, scale: 2, idiom: 'ipad', filename: 'Icon-App-76x76@2x.png' },
  { size: 83.5, scale: 2, idiom: 'ipad', filename: 'Icon-App-83.5x83.5@2x.png' },
  // App Store
  { size: 1024, scale: 1, idiom: 'ios-marketing', filename: 'Icon-App-1024x1024@1x.png' },
];

console.log('Generating iOS app icons...');

// Clean ALL existing files in the folder except Contents.json
const existingFiles = fs.readdirSync(outputDir).filter(f => f !== 'Contents.json');
existingFiles.forEach(f => {
  try { fs.unlinkSync(path.join(outputDir, f)); } catch(e) {}
});

const images = [];

sizes.forEach(({ size, scale, idiom, filename }) => {
  const pixels = Math.round(size * scale);
  const outputPath = path.join(outputDir, filename);
  
  try {
    execSync(`sips -z ${pixels} ${pixels} -s format png "${sourceImage}" --out "${outputPath}" 2>/dev/null`);
    console.log(`✓ ${filename} (${pixels}x${pixels})`);
    
    images.push({
      size: `${size}x${size}`,
      idiom,
      scale: `${scale}x`,
      filename
    });
  } catch (err) {
    console.error(`✗ Failed: ${filename}`);
  }
});

const contents = { images, info: { version: 1, author: "xcode" } };
fs.writeFileSync(path.join(outputDir, 'Contents.json'), JSON.stringify(contents, null, 2));
console.log('✓ Contents.json\n✅ Done!');
