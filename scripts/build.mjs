import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

mkdirSync('out/renderer', { recursive: true });

function git(cmd, fallback) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
}

// Baked in at build time - packaged builds ship without .git, so this can't
// be resolved at runtime. __APP_VERSION__ is the full git describe string for
// the About screen; __DISPLAY_VERSION__ is the plain release version (e.g.
// 1.1.0) for the window title and MOTD.
const { version: displayVersion } = JSON.parse(readFileSync('package.json', 'utf8'));
const define = {
  __APP_VERSION__: JSON.stringify(git('git describe --tags --always --dirty', '0.0.0-dev')),
  __DISPLAY_VERSION__: JSON.stringify(displayVersion),
  __COMMIT_HASH__: JSON.stringify(git('git rev-parse --short HEAD', 'unknown')),
};

// Main and preload run in Electron's Node context. electron and node-pty
// stay external: the former is provided by the runtime, the latter loads
// a native binary that can't be bundled.
await build({
  entryPoints: ['src/main.ts', 'src/preload.ts'],
  outdir: 'out',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron', '@lydell/node-pty'],
  sourcemap: true,
  define,
});

// Renderer bundle includes xterm and its CSS (emitted as renderer.css).
await build({
  entryPoints: ['src/renderer/renderer.ts'],
  outdir: 'out/renderer',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  sourcemap: true,
  define,
});

cpSync('src/renderer/index.html', 'out/renderer/index.html');
cpSync('src/renderer/styles.css', 'out/renderer/styles.css');
