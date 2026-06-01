const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "desktop", "assets");
const outputFile = path.join(outputDir, "studysphere.ico");
const pngFiles = [
  "android/app/src/main/res/mipmap-mdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-hdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
  "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
].map(file => path.join(root, file)).filter(file => fs.existsSync(file));

if (pngFiles.length === 0) {
  throw new Error("No launcher PNGs were found to create the Windows icon.");
}

fs.mkdirSync(outputDir, { recursive: true });

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

function createStudySpherePng(size) {
  const pixels = Buffer.alloc(size * size * 4);

  function pixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const offset = (y * size + x) * 4;
    pixels[offset] = r;
    pixels[offset + 1] = g;
    pixels[offset + 2] = b;
    pixels[offset + 3] = a;
  }

  function fillCircle(cx, cy, radius, color) {
    const r2 = radius * radius;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) pixel(x, y, ...color);
      }
    }
  }

  function strokeCircle(cx, cy, radius, width, color) {
    const outer = radius + width / 2;
    const inner = radius - width / 2;
    for (let y = Math.floor(cy - outer); y <= Math.ceil(cy + outer); y += 1) {
      for (let x = Math.floor(cx - outer); x <= Math.ceil(cx + outer); x += 1) {
        const d = Math.hypot(x - cx, y - cy);
        if (d >= inner && d <= outer) pixel(x, y, ...color);
      }
    }
  }

  function strokeEllipse(cx, cy, rx, ry, width, color) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const value = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
        if (Math.abs(value - 1) <= width / Math.max(rx, ry)) pixel(x, y, ...color);
      }
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      pixel(x, y, 7, 7, 17, 255);
    }
  }

  fillCircle(size / 2, size / 2, size * 0.35, [23, 20, 37, 255]);
  strokeCircle(size / 2, size / 2, size * 0.35, size * 0.035, [124, 58, 237, 255]);
  strokeEllipse(size / 2, size / 2, size * 0.34, size * 0.13, size * 0.022, [34, 211, 238, 255]);
  strokeEllipse(size / 2, size / 2, size * 0.13, size * 0.34, size * 0.022, [16, 185, 129, 255]);
  fillCircle(size / 2, size / 2, size * 0.085, [168, 85, 247, 255]);

  const plus = Math.round(size * 0.15);
  const bar = Math.round(size * 0.035);
  const center = Math.round(size / 2);
  for (let i = center - plus; i <= center + plus; i += 1) {
    for (let w = -bar; w <= bar; w += 1) {
      pixel(i, center + w, 255, 255, 255, 255);
      pixel(center + w, i, 255, 255, 255, 255);
    }
  }

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

const generatedPng = createStudySpherePng(256);
fs.writeFileSync(path.join(outputDir, "studysphere-256.png"), generatedPng);

const iosIcon = path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png");
if (fs.existsSync(path.dirname(iosIcon))) {
  fs.writeFileSync(iosIcon, createStudySpherePng(1024));
  console.log(`Updated iOS app icon at ${iosIcon}`);
}

const images = [{ data: generatedPng, width: 256, height: 256 }].concat(pngFiles.map(file => {
  const data = fs.readFileSync(file);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  return { data, width, height };
}));

const headerSize = 6;
const directorySize = images.length * 16;
let imageOffset = headerSize + directorySize;
const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

const entries = [];
images.forEach(image => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(image.width >= 256 ? 0 : image.width, 0);
  entry.writeUInt8(image.height >= 256 ? 0 : image.height, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(image.data.length, 8);
  entry.writeUInt32LE(imageOffset, 12);
  imageOffset += image.data.length;
  entries.push(entry);
});

fs.writeFileSync(outputFile, Buffer.concat([header, ...entries, ...images.map(image => image.data)]));
console.log(`Created Windows icon at ${outputFile}`);
