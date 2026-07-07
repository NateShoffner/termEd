import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { ED_QUOTES } from './ed-quotes';
import { EdEngine } from './ed-engine';

const term = new Terminal({
  allowTransparency: true,
  cursorBlink: true,
  fontFamily: "'Cascadia Mono', 'Cascadia Code', Consolas, 'Courier New', monospace",
  fontSize: 15,
  lineHeight: 1.15,
  scrollback: 5000,
  theme: {
    background: 'rgba(0, 0, 0, 0)',
    foreground: '#e6e9f2',
    cursor: '#6fc3ff',
    cursorAccent: '#0a0a0f',
    selectionBackground: 'rgba(111, 195, 255, 0.3)',
    black: '#1a1c2e',
    red: '#ff6b7a',
    green: '#5fd68b',
    yellow: '#ffd166',
    blue: '#6fc3ff',
    magenta: '#c792ea',
    cyan: '#66e0d5',
    white: '#e6e9f2',
    brightBlack: '#5a5f7a',
    brightRed: '#ff8a95',
    brightGreen: '#7fe8a6',
    brightYellow: '#ffe08a',
    brightBlue: '#8fd3ff',
    brightMagenta: '#dcb3f2',
    brightCyan: '#8aeee5',
    brightWhite: '#ffffff',
  },
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.loadAddon(new WebLinksAddon());
term.open(document.getElementById('terminal')!);

// WebGL renderer for low-latency typing; fall back to DOM rendering if the
// context can't be created or gets lost.
try {
  const webgl = new WebglAddon();
  webgl.onContextLoss(() => webgl.dispose());
  term.loadAddon(webgl);
} catch (e) {
  console.warn('WebGL renderer unavailable, using DOM renderer:', e);
}

fitAddon.fit();
term.focus();

// Random pose each session; Ed switches poses when he speaks.
const ED_PHOTOS = Array.from({ length: 10 }, (_, i) => `../../assets/ed-${i + 1}.png`);

// Decode every pose up front so swaps never stutter.
for (const photo of ED_PHOTOS) {
  const img = new Image();
  img.src = photo;
  img.decode().catch(() => {});
}

const ed = new EdEngine(ED_QUOTES, { photos: ED_PHOTOS });

// Wire terminal to pty
window.termed.onData((data) => {
  term.write(data);
  ed.onOutput(data);
});

term.onData((data) => {
  window.termed.input(data);
  ed.onKeystroke(data);
});

function syncSize(): void {
  fitAddon.fit();
  window.termed.resize(term.cols, term.rows);
}

let resizeTimer: ReturnType<typeof setTimeout> | undefined;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(syncSize, 80);
});

syncSize();
