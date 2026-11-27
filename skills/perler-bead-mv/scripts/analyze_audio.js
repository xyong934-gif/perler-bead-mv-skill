#!/usr/bin/env node
// Generic BGM Audio Beat & Energy Analyzer (Zero npm dependencies — uses FFmpeg + Node.js)
// Outputs per-frame normalized energy/bass/mid/high/onset arrays plus detected BPM & beat phase!

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

const AUDIO = getArg('input');
const OUT_JSON = getArg('output', path.join(process.cwd(), 'audio_analysis.json'));
const FPS = parseInt(getArg('fps', '30'), 10);
const FFMPEG = findFFmpeg(getArg('ffmpeg'));

if (!AUDIO || !fs.existsSync(AUDIO)) {
  console.error('Usage: node analyze_audio.js --input <bgm.mp3|wav> [--output audio_analysis.json] [--fps 30|60]');
  process.exit(1);
}

const SR = 22050;
const pcmBuf = execFileSync(FFMPEG, [
  '-i', AUDIO, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-hide_banner', '-loglevel', 'error', 'pipe:1'
], { maxBuffer: 150 * 1024 * 1024 });

const samples = new Float32Array(pcmBuf.buffer, pcmBuf.byteOffset, pcmBuf.byteLength / 4);
const duration = samples.length / SR;
const totalFrames = Math.round(duration * FPS);
const spf = SR / FPS;

console.log(`Audio duration: ${duration.toFixed(3)}s | totalFrames @ ${FPS}fps: ${totalFrames}`);

const alphaBass = 1 - Math.exp(-2 * Math.PI * 220 / SR);
const alphaHigh = 1 - Math.exp(-2 * Math.PI * 2800 / SR);
let lpBass = 0, lpMid = 0;

const energy = new Array(totalFrames);
const bass   = new Array(totalFrames);
const mid    = new Array(totalFrames);
const high   = new Array(totalFrames);
const onset  = new Array(totalFrames);

let prevE = 0;
let maxE = 1e-6, maxB = 1e-6, maxM = 1e-6, maxH = 1e-6, maxO = 1e-6;

for (let f = 0; f < totalFrames; f++) {
  const s0 = Math.floor(f * spf);
  const s1 = Math.min(samples.length, Math.floor((f + 1) * spf));
  let sumE = 0, sumB = 0, sumM = 0, sumH = 0;
  const n = Math.max(1, s1 - s0);
  for (let i = s0; i < s1; i++) {
    const x = samples[i];
    lpBass += alphaBass * (x - lpBass);
    lpMid  += alphaHigh * (x - lpMid);
    const bVal = lpBass, hVal = x - lpMid, mVal = lpMid - lpBass;
    sumE += x * x; sumB += bVal * bVal; sumM += mVal * mVal; sumH += hVal * hVal;
  }
  const e = Math.sqrt(sumE / n), b = Math.sqrt(sumB / n), m = Math.sqrt(sumM / n), h = Math.sqrt(sumH / n);
  const o = Math.max(0, e - prevE);
  prevE = e;
  energy[f] = e; bass[f] = b; mid[f] = m; high[f] = h; onset[f] = o;
  if (e > maxE) maxE = e; if (b > maxB) maxB = b; if (m > maxM) maxM = m; if (h > maxH) maxH = h; if (o > maxO) maxO = o;
}

for (let f = 0; f < totalFrames; f++) {
  energy[f] = +(energy[f] / maxE).toFixed(4);
  bass[f]   = +(bass[f] / maxB).toFixed(4);
  mid[f]    = +(mid[f] / maxM).toFixed(4);
  high[f]   = +(high[f] / maxH).toFixed(4);
  onset[f]  = +(onset[f] / maxO).toFixed(4);
}

let bestBpm = 136, bestScore = -1;
for (let bpm = 90; bpm <= 175; bpm += 0.5) {
  const lag = (60 / bpm) * FPS;
  let score = 0;
  for (let f = FPS; f < totalFrames - FPS * 3; f++) {
    const f2 = Math.round(f + lag), f4 = Math.round(f + lag * 2);
    if (f4 < totalFrames) score += onset[f] * (onset[f2] + 0.7 * onset[f4]);
  }
  if (score > bestScore) { bestScore = score; bestBpm = bpm; }
}
const beatSec = 60 / bestBpm;

let bestPhase = 0, bestPScore = -1;
for (let ph = 0; ph < beatSec; ph += 0.01) {
  let sc = 0;
  for (let t = ph; t < duration - 2; t += beatSec) {
    const fi = Math.round(t * FPS);
    if (fi >= 0 && fi < totalFrames) sc += onset[fi] + 0.5 * bass[fi];
  }
  if (sc > bestPScore) { bestPScore = sc; bestPhase = ph; }
}

console.log(`Detected BPM: ${bestBpm.toFixed(1)} | beatSec: ${beatSec.toFixed(4)}s | phase: ${bestPhase.toFixed(3)}s`);
for (let sec = 0; sec < duration; sec += 4) {
  const f0 = Math.floor(sec * FPS), f1 = Math.min(totalFrames, Math.floor((sec + 4) * FPS));
  let ae = 0, ab = 0;
  for (let f = f0; f < f1; f++) { ae += energy[f]; ab += bass[f]; }
  const n = Math.max(1, f1 - f0);
  console.log(`${String(sec).padStart(3)}s | E:${(ae / n).toFixed(2)} B:${(ab / n).toFixed(2)} | ${'#'.repeat(Math.round((ae / n) * 24))}`);
}

fs.mkdirSync(path.dirname(path.resolve(OUT_JSON)), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify({
  audioPath: AUDIO,
  duration: +duration.toFixed(4),
  fps: FPS,
  totalFrames,
  bpm: +bestBpm.toFixed(2),
  beatSec: +beatSec.toFixed(5),
  phase: +bestPhase.toFixed(4),
  energy, bass, mid, high, onset
}));
console.log(`Saved -> ${OUT_JSON}`);
