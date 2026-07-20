// Regenerates all app icons from assets/icon.svg.
//
// Outputs:
//   build/icon.png    1024px  (electron-builder mac/linux)
//   assets/icon.png    256px  (dev window/dock icon)
//   assets/icon.ico + build/icon.ico  (multi-size, PNG-compressed entries)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = fs.readFileSync(path.join(root, 'assets', 'icon.svg'));

const master = await sharp(svg).resize(1024, 1024).png().toBuffer();

const ICO_SIZES = [256, 128, 64, 48, 32, 24, 16];
const resized = new Map();
for (const size of ICO_SIZES) {
  resized.set(size, await sharp(master).resize(size, size).png().toBuffer());
}

// ICO container: ICONDIR + ICONDIRENTRY table + raw PNG blobs.
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(ICO_SIZES.length, 4);
const entries = [];
const blobs = [];
let offset = 6 + 16 * ICO_SIZES.length;
for (const size of ICO_SIZES) {
  const png = resized.get(size);
  const e = Buffer.alloc(16);
  e.writeUInt8(size === 256 ? 0 : size, 0);
  e.writeUInt8(size === 256 ? 0 : size, 1);
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  entries.push(e);
  blobs.push(png);
  offset += png.length;
}
const ico = Buffer.concat([header, ...entries, ...blobs]);

fs.writeFileSync(path.join(root, 'build', 'icon.png'), master);
fs.writeFileSync(path.join(root, 'assets', 'icon.png'), resized.get(256));
fs.writeFileSync(path.join(root, 'assets', 'icon.ico'), ico);
fs.writeFileSync(path.join(root, 'build', 'icon.ico'), ico);

console.log('Wrote build/icon.png, assets/icon.png, assets/icon.ico, build/icon.ico');
