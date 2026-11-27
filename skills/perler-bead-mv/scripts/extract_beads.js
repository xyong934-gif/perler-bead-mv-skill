#!/usr/bin/env node
// Generic 1:1 Perler-Bead Grid & Palette Extractor (Zero npm dependencies — uses FFmpeg + Node.js)
// Automatically crops solid background, detects bead pitch (or uses --cols), clusters into a clean
// limited Perler-bead palette (--colors), and outputs a reusable JSON { cols, rows, palette, grid }.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf('--' + name);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}

function findFFmpeg(explicit) {
  if (explicit && fs.existsSync(explicit)) return explicit;
  const candidates = [
    process.env.FFMPEG_PATH,
    'ffmpeg',
    'E:\\Program Files\\Topaz Labs LLC\\Topaz Video\\ffmpeg.exe',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      execFileSync(c, ['-version'], { stdio: 'ignore' });
      return c;
    } catch {}
  }
  throw new Error('FFmpeg not found. Install FFmpeg or pass --ffmpeg "<path>"');
}

const INPUT = getArg('input');
const OUTPUT = getArg('output', path.join(process.cwd(), 'hero_beads.json'));
const TARGET_COLS = getArg('cols') ? parseInt(getArg('cols'), 10) : null;
const MAX_COLORS = parseInt(getArg('colors', '10'), 10);
const BG_MODE = getArg('bg', 'auto'); // 'auto' | 'black' | 'white'
const FFMPEG = findFFmpeg(getArg('ffmpeg'));

if (!INPUT || !fs.existsSync(INPUT)) {
  console.error('Usage: node extract_beads.js --input <image.png|jpg> [--output hero_beads.json] [--cols 28] [--colors 10] [--bg auto|black|white]');
  process.exit(1);
}

// 1. Probe native dimensions
let W = 0, H = 0;
try {
  execFileSync(FFMPEG, ['-i', INPUT], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  const m = (e.stderr || '').match(/,\s*(\d+)x(\d+)/);
  if (m) { W = parseInt(m[1], 10); H = parseInt(m[2], 10); }
}
if (!W || !H) throw new Error(`Could not detect image size for ${INPUT}`);

const rgba = execFileSync(FFMPEG, [
  '-i', INPUT, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-hide_banner', '-loglevel', 'error', 'pipe:1'
], { maxBuffer: 100 * 1024 * 1024 });

function getPx(x, y) {
  const i = (y * W + x) * 4;
  return [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]];
}

// 2. Auto-detect background color from image corners
const corners = [getPx(2, 2), getPx(W - 3, 2), getPx(2, H - 3), getPx(W - 3, H - 3)];
const avgCornerLum = corners.reduce((s, c) => s + (c[0] + c[1] + c[2]) / 3, 0) / 4;
const avgCornerAlpha = corners.reduce((s, c) => s + c[3], 0) / 4;
const bgType = BG_MODE === 'auto'
  ? (avgCornerAlpha < 128 ? 'alpha' : (avgCornerLum > 200 ? 'white' : 'black'))
  : BG_MODE;

function isBg(r, g, b, a) {
  if (a < 64) return true;
  if (bgType === 'black') return (r + g + b) < 48;
  if (bgType === 'white') return r > 236 && g > 236 && b > 236;
  return false;
}

// 3. Tight bounding box around foreground character
let minX = W, maxX = 0, minY = H, maxY = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b, a] = getPx(x, y);
    if (!isBg(r, g, b, a)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const bw = maxX - minX + 1;
const bh = maxY - minY + 1;
if (bw <= 4 || bh <= 4) throw new Error('Foreground bounding box empty; try specifying --bg black|white');

// 4. Determine bead grid columns & rows (auto-detect pitch via autocorrelation if --cols omitted)
let cols = TARGET_COLS;
if (!cols) {
  const rowY = Math.round(minY + bh * 0.58);
  const lum = [];
  for (let x = minX + Math.floor(bw * 0.12); x < maxX - Math.floor(bw * 0.12); x++) {
    const [r, g, b] = getPx(x, rowY);
    lum.push(r * 0.3 + g * 0.59 + b * 0.11);
  }
  const mean = lum.reduce((a, b) => a + b, 0) / Math.max(1, lum.length);
  const centered = lum.map(v => v - mean);
  let bestLag = Math.max(12, Math.round(bw / 28)), bestAc = -1e18;
  const minLag = Math.max(8, Math.floor(bw / 44));
  const maxLag = Math.max(minLag + 4, Math.floor(bw / 16));
  for (let lag = minLag; lag <= maxLag; lag++) {
    let ac = 0;
    for (let i = 0; i < centered.length - lag; i++) ac += centered[i] * centered[i + lag];
    ac /= Math.max(1, centered.length - lag);
    if (ac > bestAc) { bestAc = ac; bestLag = lag; }
  }
  cols = Math.max(16, Math.min(44, Math.round(bw / bestLag)));
}
const pitch = bw / cols;
const rows = Math.max(12, Math.round(bh / pitch));
const pitchY = bh / rows;

// 5. Sample an 8-point ring inside each bead cell (avoids center pinhole skewing the bead color!)
const samples = [];
const cellColors = Array.from({ length: rows }, () => new Array(cols).fill(null));
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const cx = minX + (c + 0.5) * pitch;
    const cy = minY + (r + 0.5) * pitchY;
    const rad = Math.min(pitch, pitchY) * 0.31;
    let sr = 0, sg = 0, sb = 0, fgCnt = 0;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const sx = Math.max(0, Math.min(W - 1, Math.round(cx + Math.cos(a) * rad)));
      const sy = Math.max(0, Math.min(H - 1, Math.round(cy + Math.sin(a) * rad)));
      const [pr, pg, pb, pa] = getPx(sx, sy);
      if (!isBg(pr, pg, pb, pa)) {
        sr += pr; sg += pg; sb += pb; fgCnt++;
      }
    }
    if (fgCnt >= 4) {
      const col = [Math.round(sr / fgCnt), Math.round(sg / fgCnt), Math.round(sb / fgCnt)];
      cellColors[r][c] = col;
      samples.push(col);
    }
  }
}

// 6. Deterministic K-Means++ palette quantization into MAX_COLORS crisp Perler bead colors
function distSq(a, b) { return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; }
const K = Math.min(MAX_COLORS, Math.max(2, samples.length));
const centroids = [samples[0].slice()];
while (centroids.length < K) {
  let bestPt = samples[0], bestD = -1;
  for (const pt of samples) {
    let minD = 1e18;
    for (const ct of centroids) {
      const d = distSq(pt, ct);
      if (d < minD) minD = d;
    }
    if (minD > bestD) { bestD = minD; bestPt = pt; }
  }
  centroids.push(bestPt.slice());
}

for (let iter = 0; iter < 16; iter++) {
  const sums = Array.from({ length: K }, () => [0, 0, 0, 0]);
  for (const pt of samples) {
    let bi = 0, bd = 1e18;
    for (let k = 0; k < K; k++) {
      const d = distSq(pt, centroids[k]);
      if (d < bd) { bd = d; bi = k; }
    }
    sums[bi][0] += pt[0]; sums[bi][1] += pt[1]; sums[bi][2] += pt[2]; sums[bi][3]++;
  }
  for (let k = 0; k < K; k++) {
    if (sums[k][3] > 0) {
      centroids[k][0] = Math.round(sums[k][0] / sums[k][3]);
      centroids[k][1] = Math.round(sums[k][1] / sums[k][3]);
      centroids[k][2] = Math.round(sums[k][2] / sums[k][3]);
    }
  }
}

const SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const palette = { '.': null };
for (let k = 0; k < K; k++) palette[SYMBOLS[k]] = toHex(centroids[k]);

const grid = [];
for (let r = 0; r < rows; r++) {
  let line = '';
  for (let c = 0; c < cols; c++) {
    const col = cellColors[r][c];
    if (!col) { line += '.'; continue; }
    let bi = 0, bd = 1e18;
    for (let k = 0; k < K; k++) {
      const d = distSq(col, centroids[k]);
      if (d < bd) { bd = d; bi = k; }
    }
    line += SYMBOLS[bi];
  }
  grid.push(line);
}

fs.mkdirSync(path.dirname(path.resolve(OUTPUT)), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify({ source: INPUT, bgType, cols, rows, palette, grid }, null, 2));

console.log(`Image: ${W}x${H} (bg=${bgType}) -> BBox ${bw}x${bh} -> Grid ${cols}x${rows} (${K} colors)`);
console.log('Palette:', palette);
console.log('\n--- EXTRACTED PERLER BEAD GRID ---');
grid.forEach((l, i) => console.log(String(i).padStart(2) + ': ' + l));
console.log(`\nSaved -> ${OUTPUT}`);
