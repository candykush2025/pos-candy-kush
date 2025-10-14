#!/usr/bin/env node
/**
 * PWA Icon Generator
 * 
 * This script generates PWA icons in multiple sizes.
 * You should replace this with your actual branded icons.
 * 
 * For production, use tools like:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 * - https://favicon.io/
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('📱 PWA Icon Generator');
console.log('====================\n');

// Generate placeholder SVG icons for each size
sizes.forEach(size => {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.25}" fill="#22c55e"/>
  <text x="${size / 2}" y="${size / 2 + size * 0.15}" font-family="Arial" font-size="${size * 0.35}" font-weight="bold" fill="white" text-anchor="middle">CK</text>
</svg>`;

  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  // For this demo, we'll create SVG files
  // In production, you'd use a proper image conversion library
  const svgFilename = `icon-${size}x${size}.svg`;
  const svgFilepath = path.join(iconsDir, svgFilename);
  
  fs.writeFileSync(svgFilepath, svg);
  console.log(`✅ Created ${svgFilename}`);
});

console.log('\n⚠️  IMPORTANT: These are placeholder SVG icons.');
console.log('For production, you should:');
console.log('1. Create PNG icons using a proper tool');
console.log('2. Use your brand colors and logo');
console.log('3. Consider using https://realfavicongenerator.net/');
console.log('4. Or https://www.pwabuilder.com/imageGenerator\n');
