import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "public/og-card.png");
mkdirSync(dirname(outputPath), { recursive: true });

const width = 1200;
const height = 630;
const channels = 4;
const scanline = width * channels + 1;
const raw = Buffer.alloc(scanline * height);

const stops = [
  [7, 22, 45],
  [10, 40, 78],
  [20, 184, 212],
];

for (let y = 0; y < height; y += 1) {
  raw[y * scanline] = 0;
  for (let x = 0; x < width; x += 1) {
    const horizontal = x / (width - 1);
    const vertical = y / (height - 1);
    const light = Math.max(0, 1 - Math.hypot(horizontal - 0.78, vertical - 0.25) * 1.5);
    const r = Math.round(stops[0][0] * (1 - horizontal) + stops[1][0] * horizontal + stops[2][0] * light * 0.16);
    const g = Math.round(stops[0][1] * (1 - horizontal) + stops[1][1] * horizontal + stops[2][1] * light * 0.22);
    const b = Math.round(stops[0][2] * (1 - horizontal) + stops[1][2] * horizontal + stops[2][2] * light * 0.28);
    const offset = y * scanline + 1 + x * channels;
    raw[offset] = r;
    raw[offset + 1] = g;
    raw[offset + 2] = b;
    raw[offset + 3] = 255;
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(outputPath, png);
console.log(outputPath);
