/**
 * Generates the 1024x500 Play Store feature graphic procedurally, using the
 * same manual-PNG-encoding approach as apps/mobile/scripts/generate-icons.js
 * (no rasterizer available in this environment). Deliberately text-free —
 * the brief bans small text on the feature graphic, and a purely graphical
 * mark + "week of focus blocks" motif reads fine at banner size without it.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const WIDTH = 1024;
const HEIGHT = 500;
const OUT_FILE = path.join(__dirname, "feature-graphic.png");

const INK = [7, 7, 17, 255];
const CYAN = [0, 200, 255, 255];
const PAPER = [244, 246, 251, 255];
const LINE = [35, 35, 54, 255];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
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

function encodePng(pixels, width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
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

function setPixel(pixels, x, y, color) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const offset = (y * WIDTH + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function fillRect(pixels, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) setPixel(pixels, x, y, color);
  }
}

function strokeCircle(pixels, cx, cy, radius, width, color) {
  const outer = radius + width / 2;
  const inner = radius - width / 2;
  for (let y = Math.floor(cy - outer); y <= Math.ceil(cy + outer); y += 1) {
    for (let x = Math.floor(cx - outer); x <= Math.ceil(cx + outer); x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= inner && d <= outer) setPixel(pixels, x, y, color);
    }
  }
}

function fillCircle(pixels, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) setPixel(pixels, x, y, color);
    }
  }
}

function drawPlus(pixels, cx, cy, armLength, thickness, color) {
  for (let i = -armLength; i <= armLength; i += 1) {
    for (let w = -thickness; w <= thickness; w += 1) {
      setPixel(pixels, cx + i, cy + w, color);
      setPixel(pixels, cx + w, cy + i, color);
    }
  }
}

const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);
for (let i = 0; i < WIDTH * HEIGHT; i += 1) {
  pixels[i * 4] = INK[0];
  pixels[i * 4 + 1] = INK[1];
  pixels[i * 4 + 2] = INK[2];
  pixels[i * 4 + 3] = INK[3];
}

// The mark, left-aligned with safe margin.
const markCx = 190;
const markCy = HEIGHT / 2;
strokeCircle(pixels, markCx, markCy, 130, 12, CYAN);
const centerRadius = 36;
fillCircle(pixels, markCx, markCy, centerRadius, PAPER);
drawPlus(pixels, markCx, markCy, Math.round(centerRadius * 0.72), 7, INK);

// A row of blocks on the right - the "week of focus blocks" motif from
// Autopilot, varying height to suggest a schedule without using any text.
const blockHeights = [0.35, 0.55, 0.8, 0.5, 0.65, 0.9, 0.4];
const blockWidth = 44;
const gap = 24;
const startX = 480;
const baseY = HEIGHT - 90;
const maxHeight = 220;
blockHeights.forEach((factor, index) => {
  const height = Math.round(maxHeight * factor);
  const x = startX + index * (blockWidth + gap);
  const isAccent = index === blockHeights.length - 2; // the tallest block gets the accent
  fillRect(pixels, x, baseY - height, blockWidth, height, isAccent ? CYAN : LINE);
});

fs.writeFileSync(OUT_FILE, encodePng(pixels, WIDTH, HEIGHT));
console.log(`Wrote ${OUT_FILE} (${WIDTH}x${HEIGHT})`);
