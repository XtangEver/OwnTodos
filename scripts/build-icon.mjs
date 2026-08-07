// 生成应用图标：圆角方形底板 + 四象限色块（与界面配色一致）。
// 用法：node scripts/build-icon.mjs
// 输出：electron/assets/tray.ico（16/24/32/48/64/128/256 多尺寸，PNG 压缩条目）

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICO_PATH = join(rootDir, "electron", "assets", "tray.ico");
const PREVIEW_PATH = process.env.ICON_PREVIEW ?? "";

// 与 src/styles.css 中四象限的 --accent 保持一致
const TILE_COLORS = [
  [229, 72, 77], // 今天完成 do
  [62, 99, 221], // 计划推进 schedule
  [240, 118, 19], // 等待跟进 delegate
  [110, 86, 207] // 稍后再看 later
];
const BG_TOP = [255, 255, 255];
const BG_BOTTOM = [234, 238, 243];

// 图块几何（单位化坐标，0..1）
const TILE_HALF = 0.16;
const TILE_RADIUS = 0.055;
const TILE_OFFSET = TILE_HALF + 0.025; // 中心距画布中心
const BG_RADIUS_RATIO = 0.224; // 底板圆角
const SS = 4; // 4x 超采样抗锯齿

// ---------- CRC32 ----------
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

// ---------- PNG 编码 ----------
function pngChunk(type, data) {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

// ---------- 几何 ----------
// 圆角矩形有符号距离（负值在内部）
function roundedRectSd(px, py, cx, cy, half, radius) {
  const qx = Math.abs(px - cx) - (half - radius);
  const qy = Math.abs(py - cy) - (half - radius);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - radius;
}

// 采样单位坐标 (u, v) 处的颜色，返回 [r, g, b, a]
function sample(u, v) {
  const d = roundedRectSd(u, v, 0.5, 0.5, 0.5, BG_RADIUS_RATIO);
  if (d > 0) {
    return [0, 0, 0, 0];
  }

  const t = Math.min(1, Math.max(0, v));
  const color = [
    Math.round(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t),
    Math.round(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t),
    Math.round(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
  ];

  for (let i = 0; i < 4; i += 1) {
    const cx = i % 2 === 0 ? 0.5 - TILE_OFFSET : 0.5 + TILE_OFFSET;
    const cy = i < 2 ? 0.5 - TILE_OFFSET : 0.5 + TILE_OFFSET;
    if (roundedRectSd(u, v, cx, cy, TILE_HALF, TILE_RADIUS) <= 0) {
      const [r, g, b] = TILE_COLORS[i];
      return [r, g, b, 255];
    }
  }

  return [color[0], color[1], color[2], 255];
}

function renderIcon(size) {
  const big = size * SS;
  const buf = Buffer.alloc(big * big * 4);

  for (let y = 0; y < big; y += 1) {
    for (let x = 0; x < big; x += 1) {
      const [r, g, b, a] = sample((x + 0.5) / big, (y + 0.5) / big);
      const idx = (y * big + x) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  // 预乘 alpha 盒滤波降采样，避免边缘黑边
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let pr = 0;
      let pg = 0;
      let pb = 0;
      let pa = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const idx = ((y * SS + sy) * big + (x * SS + sx)) * 4;
          const alpha = buf[idx + 3] / 255;
          pr += buf[idx] * alpha;
          pg += buf[idx + 1] * alpha;
          pb += buf[idx + 2] * alpha;
          pa += buf[idx + 3];
        }
      }
      const n = SS * SS;
      const avgA = pa / n;
      const outIdx = (y * size + x) * 4;
      out[outIdx + 3] = Math.round(avgA);
      if (avgA > 0) {
        const alphaNorm = avgA / 255;
        out[outIdx] = Math.round(pr / n / alphaNorm);
        out[outIdx + 1] = Math.round(pg / n / alphaNorm);
        out[outIdx + 2] = Math.round(pb / n / alphaNorm);
      }
    }
  }

  return out;
}

// ---------- ICO 打包 ----------
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

// ---------- 主流程 ----------
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = sizes.map((size) => ({ size, png: encodePng(size, renderIcon(size)) }));

mkdirSync(dirname(ICO_PATH), { recursive: true });
writeFileSync(ICO_PATH, buildIco(images));
console.log(`图标已生成：${ICO_PATH}（${sizes.join("/")} px）`);

if (PREVIEW_PATH) {
  mkdirSync(dirname(PREVIEW_PATH), { recursive: true });
  writeFileSync(PREVIEW_PATH, encodePng(256, renderIcon(256)));
  console.log(`预览图：${PREVIEW_PATH}`);
}
