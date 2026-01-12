const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Source files (these are the upgrade modal screenshots)
const monthlySource = '/Users/gmac/Downloads/IMG_7210.jpg';
const annualSource = '/Users/gmac/Downloads/IMG_7209.jpg';

// Output files
const monthlyOutput = '/Users/gmac/Downloads/review-screenshot-monthly.png';
const annualOutput = '/Users/gmac/Downloads/review-screenshot-annual.png';

function convertImage(source, output) {
  const tempFile = output.replace('.png', '-temp.jpg');

  // Get image dimensions
  const info = execSync(`sips -g pixelWidth -g pixelHeight "${source}"`).toString();
  const widthMatch = info.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = info.match(/pixelHeight:\s*(\d+)/);
  const width = parseInt(widthMatch[1]);
  const height = parseInt(heightMatch[1]);

  console.log(`Processing ${path.basename(source)}: ${width}x${height}`);

  // We want to capture the modal which shows:
  // - "Unlock Your Fortune" header
  // - Feature list
  // - Monthly/Annual toggle
  // - Price
  // - CTA button
  //
  // The modal is roughly in the bottom 60% of the screen
  // A 1320x1320 square from the bottom would capture most of it

  const squareSize = width; // 1320
  // Crop from bottom: offset = height - squareSize
  const cropOffsetY = height - squareSize;

  console.log(`Will crop ${squareSize}x${squareSize} starting at Y=${cropOffsetY}`);

  // Copy file first
  execSync(`cp "${source}" "${tempFile}"`);

  // Use sips with cropOffset to crop from bottom
  // --cropOffset takes Y X (top-left corner of crop area)
  execSync(`sips --cropOffset ${cropOffsetY} 0 -c ${squareSize} ${squareSize} "${tempFile}"`);

  // Resize to 1024x1024
  execSync(`sips -z 1024 1024 "${tempFile}"`);

  // Set DPI to 72
  execSync(`sips -s dpiHeight 72 -s dpiWidth 72 "${tempFile}"`);

  // Convert to PNG
  execSync(`sips -s format png "${tempFile}" --out "${output}"`);

  // Clean up temp file
  fs.unlinkSync(tempFile);

  // Verify output
  const outputInfo = execSync(`sips -g pixelWidth -g pixelHeight -g dpiWidth "${output}"`).toString();
  console.log(`Output info:\n${outputInfo}`);

  console.log(`Created: ${output}\n`);
}

try {
  convertImage(monthlySource, monthlyOutput);
  convertImage(annualSource, annualOutput);
  console.log('Done! Upload these files to App Store Connect:');
  console.log(`  Monthly: ${monthlyOutput}`);
  console.log(`  Annual: ${annualOutput}`);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
