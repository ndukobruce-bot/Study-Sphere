/**
 * Composites raw device screenshots into store-ready images: a simple
 * drawn device-frame outline (not a stock mockup image — kept dependency
 * free) plus the matching headline from headlines.json, rendered via an
 * SVG overlay (sharp supports compositing SVG buffers, avoiding a native
 * canvas dependency).
 *
 * NOT run in this environment — there is nothing in ./raw/ to composite
 * without a device (see README.md). This is the real compositor, ready to
 * run the moment seed-and-capture.yaml has produced raw screenshots.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const RAW_DIR = path.join(__dirname, "raw");
const OUT_DIR = path.join(__dirname, "output");
const headlines = require("./headlines.json");

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const FRAME_MARGIN = 48;
const FRAME_RADIUS = 64;
const HEADLINE_HEIGHT = 220;

// Design-token colors, duplicated here rather than imported since this
// script runs outside the Expo/Metro module graph - see
// apps/mobile/src/theme/tokens.ts for the source of truth.
const INK = "#070711";
const CYAN = "#00C8FF";
const PAPER = "#F4F6FB";

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function frameSvg(headline) {
  const screenTop = HEADLINE_HEIGHT + FRAME_MARGIN;
  const screenLeft = FRAME_MARGIN;
  const screenWidth = CANVAS_WIDTH - FRAME_MARGIN * 2;
  const screenHeight = CANVAS_HEIGHT - screenTop - FRAME_MARGIN;

  return Buffer.from(`
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="${INK}"/>
      <text x="${CANVAS_WIDTH / 2}" y="${HEADLINE_HEIGHT / 2 + 20}"
            font-family="Inter, -apple-system, sans-serif" font-size="52" font-weight="700"
            fill="${PAPER}" text-anchor="middle">${escapeXml(headline)}</text>
      <rect x="${screenLeft - 10}" y="${screenTop - 10}" width="${screenWidth + 20}" height="${screenHeight + 20}"
            rx="${FRAME_RADIUS}" fill="none" stroke="${CYAN}" stroke-width="6"/>
    </svg>
  `);
}

async function composeOne(name) {
  const rawPath = path.join(RAW_DIR, `${name}.png`);
  if (!fs.existsSync(rawPath)) {
    console.warn(`Skipping ${name}: no raw capture at ${rawPath}`);
    return;
  }

  const screenTop = HEADLINE_HEIGHT + FRAME_MARGIN;
  const screenLeft = FRAME_MARGIN;
  const screenWidth = CANVAS_WIDTH - FRAME_MARGIN * 2;
  const screenHeight = CANVAS_HEIGHT - screenTop - FRAME_MARGIN;

  const resizedScreen = await sharp(rawPath)
    .resize(screenWidth, screenHeight, { fit: "cover" })
    .toBuffer();

  await sharp(frameSvg(headlines[name] ?? name))
    .composite([{ input: resizedScreen, left: screenLeft, top: screenTop }])
    .png()
    .toFile(path.join(OUT_DIR, `${name}.png`));

  console.log(`Wrote ${name}.png`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const name of Object.keys(headlines)) {
    await composeOne(name);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
