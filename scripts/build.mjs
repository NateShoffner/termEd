import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'fs';

mkdirSync('out/renderer', { recursive: true });

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
});

// Renderer bundle includes xterm and its CSS (emitted as renderer.css).
await build({
  entryPoints: ['src/renderer/renderer.ts'],
  outdir: 'out/renderer',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  sourcemap: true,
});

cpSync('src/renderer/index.html', 'out/renderer/index.html');
cpSync('src/renderer/styles.css', 'out/renderer/styles.css');
