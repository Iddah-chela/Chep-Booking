/**
 * One-time image compression script — run with:  node compress-assets.js
 * Uses sharp (already in devDependencies) to shrink large PNGs.
 * Overwrites originals in-place. Run once, then commit the results.
 */
import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const ASSETS_DIR = './src/assets';
const MAX_WIDTH   = 1920; // cap hero/room images at 1920px wide
const QUALITY     = 80;   // PNG compression quality

async function compress() {
    const files = await readdir(ASSETS_DIR);
    const pngs = files.filter(f => f.toLowerCase().endsWith('.png'));

    for (const file of pngs) {
        const filePath = join(ASSETS_DIR, file);
        const before = (await stat(filePath)).size;

        // Re-encode with sharp: limit dimensions + optimize PNG compression
        const buf = await sharp(filePath)
            .resize({ width: MAX_WIDTH, withoutEnlargement: true })
            .png({ quality: QUALITY, compressionLevel: 9, effort: 10 })
            .toBuffer();

        // Only overwrite if we actually made it smaller
        if (buf.length < before) {
            const { writeFile } = await import('fs/promises');
            await writeFile(filePath, buf);
            const pct = (((before - buf.length) / before) * 100).toFixed(1);
            console.log(`✓ ${file}: ${(before/1024).toFixed(0)}KB → ${(buf.length/1024).toFixed(0)}KB  (-${pct}%)`);
        } else {
            console.log(`– ${file}: already optimal`);
        }
    }
    console.log('\nDone. Commit the compressed images.');
}

compress().catch(console.error);
