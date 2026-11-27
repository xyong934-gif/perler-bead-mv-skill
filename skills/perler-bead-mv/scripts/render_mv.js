#!/usr/bin/env node
// Generic 1080p Headless Chromium + FFmpeg Perler-Bead MV Renderer (Cross-Platform, Zero npm deps)
// Supports:
//   --keyframes : renders sprite sheet & 16-frame storyboard PNGs for visual QA before full render
//   (default)   : streams raw 1080p RGBA frames directly into FFmpeg (NVENC auto-detect -> libx264 fallback)

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFileSync } = require('child_process');

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
    try { execFileSync(c, ['-version'], { stdio: 'ignore' }); return c; } catch {}
  }
  throw new Error('FFmpeg not found. Install FFmpeg or pass --ffmpeg "<path>"');
}

function findChrome(explicit) {
  if (explicit && fs.existsSync(explicit)) return explicit;
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  // Also scan Playwright cached Chromium installs on Windows/macOS/Linux
  const pwRoot = path.join(os.homedir(), process.platform === 'win32' ? 'AppData/Local/ms-playwright' : '.cache/ms-playwright');
  if (fs.existsSync(pwRoot)) {
    for (const d of fs.readdirSync(pwRoot).filter(x => x.startsWith('chromium'))) {
      candidates.push(
        path.join(pwRoot, d, 'chrome-win', 'chrome.exe'),
        path.join(pwRoot, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        path.join(pwRoot, d, 'chrome-linux', 'chrome')
      );
    }
  }
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  throw new Error('Chrome/Chromium not found. Install Chrome or pass --chrome "<path>"');
}

function detectVideoCodec(ffmpegPath) {
  try {
    const out = execFileSync(ffmpegPath, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    if (out.includes('h264_nvenc')) return ['h264_nvenc', '-preset', 'p5', '-cq', '18', '-b:v', '0'];
    if (out.includes('h264_videotoolbox')) return ['h264_videotoolbox', '-b:v', '18M'];
  } catch {}
  return ['libx264', '-preset', 'medium', '-crf', '18'];
}

const WORK_DIR = path.resolve(getArg('workdir', process.cwd()));
const AUDIO_PATH = getArg('audio');
const OUTPUT_MP4 = path.resolve(getArg('output', path.join(WORK_DIR, 'perler_mv_1080p.mp4')));
const isKeyframes = process.argv.includes('--keyframes');
const FFMPEG_PATH = findFFmpeg(getArg('ffmpeg'));
const CHROME_PATH = findChrome(getArg('chrome'));

const audioMetaPath = path.join(WORK_DIR, 'audio_analysis.json');
const audioMeta = fs.existsSync(audioMetaPath) ? JSON.parse(fs.readFileSync(audioMetaPath, 'utf8')) : { totalFrames: 900, fps: 30 };
const totalFrames = audioMeta.totalFrames || 900;
const fps = audioMeta.fps || 30;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
};

let ffmpeg = null, ffmpegDone = null, framesReceived = 0;
const tStart = Date.now();

if (!isKeyframes) {
  const codecArgs = detectVideoCodec(FFMPEG_PATH);
  const ffArgs = [
    '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '1920x1080', '-framerate', String(fps), '-i', 'pipe:0'
  ];
  if (AUDIO_PATH && fs.existsSync(AUDIO_PATH)) {
    ffArgs.push('-i', AUDIO_PATH, '-map', '0:v:0', '-map', '1:a:0');
  }
  ffArgs.push('-c:v', ...codecArgs, '-pix_fmt', 'yuv420p');
  if (AUDIO_PATH && fs.existsSync(AUDIO_PATH)) {
    ffArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  }
  ffArgs.push('-movflags', '+faststart', OUTPUT_MP4);

  console.log(`[Perler Render] Codec=${codecArgs[0]} | ${totalFrames} frames @ ${fps}fps -> ${OUTPUT_MP4}`);
  ffmpeg = spawn(FFMPEG_PATH, ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderrTail = '';
  ffmpeg.stderr.on('data', d => { stderrTail = (stderrTail + d.toString()).slice(-2000); });
  ffmpegDone = new Promise((resolve, reject) => {
    ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg failed (${code}):\n${stderrTail}`)));
    ffmpeg.on('error', reject);
  });
}

let chrome = null;
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perler-mv-chrome-'));

function cleanup(code) {
  try { if (chrome) chrome.kill(); } catch {}
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
  server.close(() => process.exit(code));
  setTimeout(() => process.exit(code), 1200);
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://127.0.0.1');
  const pathname = urlObj.pathname;

  if (req.method === 'POST' && pathname === '/save_png') {
    const name = path.basename(urlObj.searchParams.get('name') || 'preview.png');
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const b64 = Buffer.concat(chunks).toString('utf8').replace(/^data:image\/png;base64,/, '');
      const outPath = path.join(WORK_DIR, name);
      fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
      console.log(`[Saved] ${outPath}`);
      res.writeHead(200); res.end('ok');
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/frames') {
    const count = parseInt(urlObj.searchParams.get('count') || '1', 10);
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      try {
        const buf = Buffer.concat(chunks);
        if (!ffmpeg.stdin.write(buf)) await new Promise(r => ffmpeg.stdin.once('drain', r));
        framesReceived += count;
        if (framesReceived % 160 === 0 || framesReceived >= totalFrames) {
          const el = (Date.now() - tStart) / 1000;
          console.log(`[Render] ${framesReceived}/${totalFrames} (${((framesReceived / totalFrames) * 100).toFixed(1)}%) | ${(framesReceived / Math.max(0.1, el)).toFixed(1)} fps`);
        }
        res.writeHead(200); res.end('ok');
      } catch (err) {
        console.error('[Pipe Error]', err);
        res.writeHead(500); res.end('err');
        cleanup(1);
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/error') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      console.error('[Browser Error]\n' + Buffer.concat(chunks).toString('utf8'));
      res.writeHead(200); res.end('ok');
      cleanup(1);
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/done') {
    res.writeHead(200); res.end('ok');
    (async () => {
      try {
        if (ffmpeg) {
          ffmpeg.stdin.end();
          await ffmpegDone;
          const mb = (fs.statSync(OUTPUT_MP4).size / 1048576).toFixed(2);
          console.log(`[Success] ${OUTPUT_MP4} (${mb} MB) in ${((Date.now() - tStart) / 1000).toFixed(1)}s`);
        }
        cleanup(0);
      } catch (err) {
        console.error('[FFmpeg Finalize Error]', err);
        cleanup(1);
      }
    })();
    return;
  }

  const safePath = pathname === '/' ? 'render.html' : pathname.replace(/^\/+/, '');
  const fullPath = path.join(WORK_DIR, safePath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(fullPath)] || 'application/octet-stream' });
    fs.createReadStream(fullPath).pipe(res);
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const targetUrl = `http://127.0.0.1:${port}/render.html?mode=${isKeyframes ? 'keyframes' : 'render'}`;
  console.log(`[Server] ${targetUrl}`);
  chrome = spawn(CHROME_PATH, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--window-size=1920,1080', `--user-data-dir=${profileDir}`, targetUrl
  ], { stdio: 'ignore' });
});
