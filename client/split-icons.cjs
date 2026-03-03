/**
 * Splits "icon and favicon.png" into separate app icon and favicon files.
 * Run from client/: node split-icons.cjs
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, 'src', 'assets', 'icon and favicon.png');
const ICONS_DIR = path.join(__dirname, 'public', 'icons');

async function run() {
  const meta = await sharp(SRC).metadata();
  console.log(`Source: ${meta.width}x${meta.height}`);

  // The image is two side-by-side icons.
  // Image is 1536x1024. Left ~65% = app icon, right ~35% = favicon.
  // Split around x=950 based on visual analysis.
  const splitX = Math.round(meta.width * 0.62);  // ≈ 952
  const appIconWidth  = splitX;
  const faviconWidth  = meta.width - splitX;
  const faviconLeft   = splitX;
  const height        = meta.height;

  // Remove bottom-label area: text labels appear in the bottom ~12% of height
  const contentHeight = Math.round(height * 0.85);

  console.log(`App icon region: 0,0  ${appIconWidth}x${contentHeight}`);
  console.log(`Favicon region : ${faviconLeft},0  ${faviconWidth}x${contentHeight}`);

  // --- App Icon (left half) ---
  const appIconBase = await sharp(SRC)
    .extract({ left: 0, top: 0, width: appIconWidth, height: contentHeight })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Save at multiple PWA sizes
  await sharp(appIconBase).resize(512, 512).toFile(path.join(ICONS_DIR, 'icon-512.png'));
  console.log('✓ icon-512.png');
  await sharp(appIconBase).resize(192, 192).toFile(path.join(ICONS_DIR, 'icon-192.png'));
  console.log('✓ icon-192.png');
  await sharp(appIconBase).resize(180, 180).toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // --- Favicon (right half) ---
  const faviconBase = await sharp(SRC)
    .extract({ left: faviconLeft, top: 0, width: faviconWidth, height: contentHeight })
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp(faviconBase).resize(64, 64).toFile(path.join(ICONS_DIR, 'favicon.png'));
  console.log('✓ favicon.png (64x64)');
  await sharp(faviconBase).resize(32, 32).toFile(path.join(ICONS_DIR, 'favicon-32.png'));
  console.log('✓ favicon-32.png');

  // Also save favicon to public/ root as favicon.png (referenced by index.html)
  await sharp(faviconBase).resize(32, 32).toFile(path.join(__dirname, 'public', 'favicon.png'));
  console.log('✓ public/favicon.png');

  console.log('\nDone! All icons generated.');
}

run().catch(console.error);
