/**
 * Generates real app icon assets from the design tokens instead of shipping
 * Expo's default template logo (docs/AUDIT.md/PLAY_CHECKLIST flags this).
 * No image-rasterization tool (ImageMagick, sharp, rsvg) is available in
 * this environment, so this writes raw PNGs the same way the old repo's
 * scripts/create-windows-icon.js did: a manual pixel buffer + zlib-deflated
 * PNG chunks. The mark itself is a simplified, single-accent version of the
 * old apps/web/assets/images/studysphere-icon.svg motif (ring + center
 * mark), brought in line with the new design system's "one accent color"
 * rule instead of the old purple/cyan/green multi-color version.
 *
 * This is a real, legible mark, not a placeholder - but it is generated,
 * not designed. If a human designer produces a real icon later, replace
 * these files and this script becomes unnecessary.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT_DIR = path.join(__dirname, "..", "assets");

const INK = [7, 7, 17, 255];
const CYAN = [0, 200, 255, 255];
const PAPER = [244, 246, 251, 255];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(pixels, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function makeCanvas(size, background) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 4] = background[0];
    pixels[i * 4 + 1] = background[1];
    pixels[i * 4 + 2] = background[2];
    pixels[i * 4 + 3] = background[3];
  }
  return pixels;
}

function setPixel(pixels, size, x, y, color) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const offset = (y * size + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function strokeCircle(pixels, size, cx, cy, radius, width, color) {
  const outer = radius + width / 2;
  const inner = radius - width / 2;
  for (let y = Math.floor(cy - outer); y <= Math.ceil(cy + outer); y += 1) {
    for (let x = Math.floor(cx - outer); x <= Math.ceil(cx + outer); x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= inner && d <= outer) setPixel(pixels, size, x, y, color);
    }
  }
}

function fillCircle(pixels, size, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPixel(pixels, size, x, y, color);
    }
  }
}

function drawPlus(pixels, size, cx, cy, armLength, thickness, color) {
  for (let i = -armLength; i <= armLength; i += 1) {
    for (let w = -thickness; w <= thickness; w += 1) {
      setPixel(pixels, size, cx + i, cy + w, color);
      setPixel(pixels, size, cx + w, cy + i, color);
    }
  }
}

/** The full mark: ring + center plus, on an ink background. Used for icon.png. */
function drawMark(pixels, size, scale) {
  const cx = size / 2;
  const cy = size / 2;
  const centerRadius = size * 0.09 * scale;
  strokeCircle(pixels, size, cx, cy, size * 0.32 * scale, size * 0.03 * scale, CYAN);
  fillCircle(pixels, size, cx, cy, centerRadius, PAPER);
  // Arm length stays inside centerRadius so the cross never spills onto the
  // area outside the paper disc (that area is transparent in the adaptive
  // foreground layer and would show the plus floating on its own otherwise).
  drawPlus(pixels, size, Math.round(cx), Math.round(cy), Math.round(centerRadius * 0.72), Math.round(size * 0.016 * scale), INK);
}

function writeIcon(fileName, size, draw) {
  const pixels = makeCanvas(size, INK);
  draw(pixels);
  fs.writeFileSync(path.join(OUT_DIR, fileName), encodePng(pixels, size));
  console.log(`Wrote ${fileName} (${size}x${size})`);
}

// Primary icon (iOS + fallback) - full mark at full bleed.
writeIcon("icon.png", 1024, pixels => drawMark(pixels, 1024, 1));

// Android adaptive icon: foreground mark kept inside the ~66% safe zone,
// transparent background so the OS-applied mask/shape shows through.
writeIcon("android-icon-foreground.png", 1024, pixels => {
  // Start fully transparent, then draw the mark scaled into the safe zone.
  for (let i = 0; i < pixels.length; i += 4) pixels[i + 3] = 0;
  drawMark(pixels, 1024, 0.62);
});
writeIcon("android-icon-background.png", 1024, () => {});
writeIcon("android-icon-monochrome.png", 1024, pixels => {
  for (let i = 0; i < pixels.length; i += 4) pixels[i + 3] = 0;
  const cx = 512, cy = 512;
  strokeCircle(pixels, 1024, cx, cy, 1024 * 0.32 * 0.62, 1024 * 0.03 * 0.62, [255, 255, 255, 255]);
  fillCircle(pixels, 1024, cx, cy, 1024 * 0.09 * 0.62, [255, 255, 255, 255]);
});

// Splash icon - the mark only, transparent background (Expo composites it
// onto the splash background color from app.json).
writeIcon("splash-icon.png", 1024, pixels => {
  for (let i = 0; i < pixels.length; i += 4) pixels[i + 3] = 0;
  drawMark(pixels, 1024, 0.55);
});

// Favicon (web) - small, so keep the ring thick enough to read.
writeIcon("favicon.png", 196, pixels => drawMark(pixels, 196, 1));

console.log("Done. These are generated placeholders that are actually on-brand and legible, not the Expo default logo - replace with a designer's icon when one exists.");
