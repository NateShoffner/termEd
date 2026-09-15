// Records the scripted demo (npm run demo) and encodes the README preview:
// assets/demo.gif, plus assets/demo.webm as a higher quality copy.
//
//   npm run demo:record [-- --out <dir>] [--gif-width 800] [--gif-fps 8] [--tail 10] [--keep]
//
// Needs ffmpeg on PATH and a build in out/ (the npm script builds first).
// Launches the app in demo mode with a throwaway profile, so saved settings
// and window size don't leak into the recording, and captures the page
// through the DevTools screencast. Page captures don't include the OS-drawn
// window buttons, so the right end of the tab strip is empty in the video.

import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import electronPath from 'electron';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values: args } = parseArgs({
  options: {
    out: { type: 'string', default: path.join(root, 'assets') },
    'gif-width': { type: 'string', default: '800' },
    'gif-fps': { type: 'string', default: '8' },
    // Seconds to keep recording after the script ends, for Ed's idle check-in.
    tail: { type: 'string', default: '10' },
    port: { type: 'string', default: '9451' },
    keep: { type: 'boolean', default: false },
  },
});

// The intermediate video's rate. Screencast frames only arrive when something
// repaints, so gaps are filled by repeating the latest frame.
const CAPTURE_FPS = 30;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ffmpeg(ffmpegArgs) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-y', ...ffmpegArgs], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg exited with ${result.status}`);
}

if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).error) {
  console.error('ffmpeg was not found on PATH. Install it (https://ffmpeg.org/download.html) and retry.');
  process.exit(1);
}
if (!fs.existsSync(path.join(root, 'out', 'main.js'))) {
  console.error('No build in out/. Run npm run build first (npm run demo:record does this for you).');
  process.exit(1);
}

// Just enough of a DevTools Protocol client: commands and event listeners.
class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.ws.onmessage = (message) => {
      const msg = JSON.parse(message.data);
      if (msg.id !== undefined) {
        const request = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) request?.reject(new Error(`${request.method}: ${msg.error.message}`));
        else request?.resolve(msg.result);
      } else {
        this.listeners.get(msg.method)?.(msg.params);
      }
    };
  }

  async open() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = () => reject(new Error(`could not connect to ${this.ws.url}`));
    });
  }

  on(method, listener) {
    this.listeners.set(method, listener);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { method, resolve, reject }));
  }

  async evaluate(expression) {
    const { result } = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    return result.value;
  }
}

async function findDemoPage(port) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page' && t.url.includes('index.html'));
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error(`the app never exposed a DevTools page on port ${port}`);
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'termed-demo-'));
const master = path.join(work, 'master.mkv');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const app = spawn(
  electronPath,
  [
    root,
    '--demo',
    `--remote-debugging-port=${args.port}`,
    `--user-data-dir=${path.join(work, 'profile')}`,
    // Otherwise a window covered by other windows stops painting on Windows.
    '--disable-features=CalculateNativeWinOcclusion',
  ],
  { env, stdio: 'ignore' }
);

try {
  const cdp = new Cdp(await findDemoPage(args.port));
  await cdp.open();
  await cdp.send('Page.enable');

  // Lossless intermediate; the GIF and webm are both encoded from it after.
  const encoder = spawn(
    'ffmpeg',
    ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(CAPTURE_FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264rgb', '-qp', '0', '-preset', 'ultrafast', master],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );

  let firstFrameAt = null;
  let firstFrameClock = null;
  let latest = null;
  let written = 0;
  const writeFrames = async (seconds) => {
    const target = Math.round(seconds * CAPTURE_FPS);
    while (latest && written < target) {
      if (!encoder.stdin.write(latest)) await once(encoder.stdin, 'drain');
      written++;
    }
  };

  // Chromium sends the next frame only after the previous one is acked, and
  // frames are handled in order, so the video never gets ahead of the page.
  let frames = Promise.resolve();
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames = frames.then(async () => {
      firstFrameAt ??= metadata.timestamp;
      firstFrameClock ??= Date.now();
      await writeFrames(metadata.timestamp - firstFrameAt);
      latest = Buffer.from(data, 'base64');
      await cdp.send('Page.screencastFrameAck', { sessionId });
    });
  });

  // Restart the demo from the top now that everything's connected.
  const loaded = new Promise((resolve) => cdp.on('Page.loadEventFired', resolve));
  await cdp.send('Page.reload');
  await loaded;
  await cdp.send('Page.startScreencast', { format: 'png' });
  console.log('Recording the demo script (about 90 seconds)...');

  // renderer.ts sets this once runDemo() finishes.
  while (!(await cdp.evaluate(`document.documentElement.hasAttribute('data-demo-done')`))) {
    await sleep(500);
  }
  await sleep(Number(args.tail) * 1000);
  await cdp.send('Page.stopScreencast');
  await frames;
  if (!latest) throw new Error('the screencast produced no frames');
  await writeFrames((Date.now() - firstFrameClock) / 1000);
  encoder.stdin.end();
  const [code] = await once(encoder, 'close');
  if (code !== 0) throw new Error(`ffmpeg (capture) exited with ${code}`);
  console.log(`Captured ${(written / CAPTURE_FPS).toFixed(1)}s. Encoding...`);
} finally {
  app.kill();
}

fs.mkdirSync(args.out, { recursive: true });
const gif = path.join(args.out, 'demo.gif');
const webm = path.join(args.out, 'demo.webm');
const palette = path.join(work, 'palette.png');

// Two-pass GIF: a palette built from the whole video (weighted toward what
// changes between frames), then applied with ordered dithering, which keeps
// small terminal text crisper and the file smaller than error diffusion.
const gifScale = `fps=${args['gif-fps']},scale=${args['gif-width']}:-1:flags=lanczos`;
ffmpeg(['-i', master, '-vf', `${gifScale},palettegen=stats_mode=diff`, palette]);
ffmpeg(['-i', master, '-i', palette, '-lavfi', `${gifScale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
  '-loop', '0', gif]);
ffmpeg(['-i', master, '-vf', 'scale=w=min(1280\\,iw):h=-2:flags=lanczos,format=yuv420p',
  '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1', '-an', webm]);

const size = (file) => `${(fs.statSync(file).size / 1e6).toFixed(1)} MB`;
console.log(`Wrote ${path.relative(root, gif)} (${size(gif)}) and ${path.relative(root, webm)} (${size(webm)})`);

if (args.keep) console.log(`Kept the intermediate recording in ${work}`);
else fs.rmSync(work, { recursive: true, force: true });
