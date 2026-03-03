/**
 * Generates PWA icons from src/assets/icon.png and src/assets/favicon.png.
 * Run from client/: node split-icons-2.cjs
 */
const sharp = require('sharp');
const path = require('path');

const ICON_SRC    = path.join(__dirname, 'src', 'assets', 'icon.png');
const FAVICON_SRC = path.join(__dirname, 'src', 'assets', 'favicon.png');
const ICONS_DIR   = path.join(__dirname, 'public', 'icons');

async function run() {
  const { join } = path;

  // --- App Icon ---
  await sharp(ICON_SRC).resize(512, 512).toFile(join(ICONS_DIR, 'icon-512-2.png'));
  console.log('✓ icon-512-2.png');
  await sharp(ICON_SRC).resize(192, 192).toFile(join(ICONS_DIR, 'icon-192-2.png'));
  console.log('✓ icon-192-2.png');
  await sharp(ICON_SRC).resize(180, 180).toFile(join(ICONS_DIR, 'apple-touch-icon-2.png'));
  console.log('✓ apple-touch-icon-2.png');

  // --- Favicon ---
  await sharp(FAVICON_SRC).trim({ threshold: 10 }).resize(512, 512, { fit: 'fill' }).toFile(join(ICONS_DIR, 'favicon-512-2.png'));
  console.log('✓ favicon-512-2.png');
  await sharp(FAVICON_SRC).resize(32, 32).toFile(join(ICONS_DIR, 'favicon-32-2.png'));
  console.log('✓ favicon-32-2.png');
  await sharp(FAVICON_SRC).resize(32, 32).toFile(join(__dirname, 'public', 'favicon-2.png'));
  console.log('✓ public/favicon-2.png');

  console.log('\nDone! All -2 icons generated.');
}

run().catch(console.error);
