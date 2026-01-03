const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed.');
  console.error('Please install it by running: npm install sharp');
  process.exit(1);
}

const svgPath = path.join(__dirname, 'newicon.svg');
const iconsDir = path.join(__dirname, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Sizes to generate
const sizes = [16, 48, 128];

async function convertSvgToPng() {
  try {
    // Read the SVG file
    const svgBuffer = fs.readFileSync(svgPath);
    
    console.log('Converting SVG to PNG files...');
    
    // Convert to each size
    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Created ${outputPath} (${size}x${size})`);
    }
    
    console.log('\nAll icons generated successfully!');
  } catch (error) {
    console.error('Error converting SVG:', error);
    process.exit(1);
  }
}

convertSvgToPng();

