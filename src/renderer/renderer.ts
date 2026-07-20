import { Terminal, type ITerminalOptions } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { ED_QUOTES } from './ed-quotes';
import { EdEngine, type EdEngineOptions } from './ed-engine';
import { runDemo } from './demo';
import { TabManager, createSession } from './tab-manager';

const TERMINAL_OPTIONS: ITerminalOptions = {
  allowTransparency: true,
  cursorBlink: true,
  fontFamily:
    "'CaskaydiaCove Nerd Font Mono', 'Cascadia Mono', 'Cascadia Code', Consolas, 'Courier New', monospace",
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
};

// Random pose each session; Ed switches poses when he speaks.
const ED_PHOTOS = Array.from({ length: 10 }, (_, i) => `../../assets/ed-${i + 1}.png`);

// Decode every pose up front so swaps never stutter.
for (const photo of ED_PHOTOS) {
  const img = new Image();
  img.src = photo;
  img.decode().catch(() => {});
}

const edOptions: EdEngineOptions = {
  photos: ED_PHOTOS,
  platform: window.termed.platform,
  // Demo pacing: reactions land close together, and the idle check-in fires
  // shortly after the script ends (14s clears every mid-demo pause).
  ...(window.termed.demo
    ? { reactionCooldown: 2_500, globalCooldown: 4_000, idleThreshold: 14_000 }
    : {}),
};

if (window.termed.demo) {
  // Scripted showcase: one fake, non-interactive tab, no real pty.
  document.getElementById('ed-new-tab')!.style.display = 'none';
  const demoTab = document.createElement('div');
  demoTab.className = 'ed-tab active';
  demoTab.textContent = 'Demo';
  document.getElementById('ed-tablist')!.appendChild(demoTab);

  const { session, pane } = createSession();
  session.classList.add('active');
  document.getElementById('terminal-panes')!.appendChild(session);

  const term = new Terminal(TERMINAL_OPTIONS);
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(pane);
  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => webgl.dispose());
    term.loadAddon(webgl);
  } catch (e) {
    console.warn('WebGL renderer unavailable, using DOM renderer:', e);
  }
  fitAddon.fit();
  term.focus();
  window.addEventListener('resize', () => fitAddon.fit());

  const ed = new EdEngine(session, ED_QUOTES, edOptions);
  void runDemo(term, ed);
} else {
  const tabManager = new TabManager({
    terminalOptions: TERMINAL_OPTIONS,
    quotes: ED_QUOTES,
    edOptions,
  });

  document
    .getElementById('ed-new-tab')!
    .addEventListener('click', () => void tabManager.createTab());

  void tabManager.createTab();
}

// About overlay
const aboutOverlay = document.getElementById('ed-about')!;
document.getElementById('ed-about-version')!.textContent = window.termed.version;
document.getElementById('ed-about-commit')!.textContent = window.termed.commit;

const openAbout = () => aboutOverlay.classList.remove('hidden');
const closeAbout = () => aboutOverlay.classList.add('hidden');

document.getElementById('ed-about-btn')!.addEventListener('click', openAbout);
document.getElementById('ed-about-close')!.addEventListener('click', closeAbout);
aboutOverlay.addEventListener('click', (e) => {
  if (e.target === aboutOverlay) closeAbout();
});
document.getElementById('ed-about-link')!.addEventListener('click', (e) => {
  e.preventDefault();
  window.termed.openExternal('https://nateshoffner.com');
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !aboutOverlay.classList.contains('hidden')) closeAbout();
});
