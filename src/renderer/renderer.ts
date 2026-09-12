import { Terminal, type ITerminalOptions } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { ED_QUOTES } from './ed-quotes';
import { EdEngine, type EdEngineOptions } from './ed-engine';
import { runDemo } from './demo';
import { TabManager, createSession } from './tab-manager';
import { createPaneEl } from './panes';
import { COMMIT_URL, CREDITS_URL } from '../links';

const TERMINAL_OPTIONS: ITerminalOptions = {
  allowTransparency: true,
  cursorBlink: true,
  // Nerd Font families come first so prompt themes (oh-my-posh, starship) get
  // their icon glyphs instead of tofu boxes. Nerd Fonts has shipped several
  // naming schemes over its versions; a family that isn't installed just
  // falls through to the next one.
  fontFamily:
    "'CaskaydiaCove Nerd Font Mono', 'CaskaydiaCove NFM', 'CaskaydiaCove Nerd Font', 'CaskaydiaCove NF', 'Symbols Nerd Font Mono', 'Cascadia Mono', 'Cascadia Code', Consolas, 'Courier New', monospace",
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

let tabManager: TabManager | null = null;

if (window.termed.demo) {
  // Scripted showcase: one fake, non-interactive tab, no real pty.
  document.getElementById('ed-new-tab')!.style.display = 'none';
  const demoTab = document.createElement('div');
  demoTab.className = 'ed-tab active';
  demoTab.textContent = 'Demo';
  document.getElementById('ed-tablist')!.appendChild(demoTab);

  const { session, root } = createSession();
  session.classList.add('active');
  document.getElementById('terminal-panes')!.appendChild(session);

  const pane = createPaneEl();
  pane.classList.add('active-pane');
  root.appendChild(pane);

  const term = new Terminal(TERMINAL_OPTIONS);
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());
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
  tabManager = new TabManager({
    terminalOptions: TERMINAL_OPTIONS,
    quotes: ED_QUOTES,
    edOptions,
  });

  document
    .getElementById('ed-new-tab')!
    .addEventListener('click', () => void tabManager!.createTab());

  void tabManager.createTab();
}

// Tab bar dropdown menu
const menu = document.getElementById('ed-menu')!;
const menuButton = document.getElementById('ed-tab-menu')!;
const closeMenu = () => menu.classList.add('hidden');

// Demo mode has no tab manager, so only the About entry does anything.
if (window.termed.demo) {
  for (const el of menu.querySelectorAll<HTMLElement>(
    '[data-action="new-tab"], [data-action="split-row"], [data-action="split-column"], .ed-menu-sep'
  )) {
    el.style.display = 'none';
  }
}

menuButton.addEventListener('click', (e) => {
  e.stopPropagation();
  menu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!menu.classList.contains('hidden') && !menu.contains(e.target as Node)) closeMenu();
});

menu.addEventListener('click', (e) => {
  const action = (e.target as HTMLElement).closest('button')?.dataset.action;
  if (!action) return;
  closeMenu();
  if (action === 'new-tab') void tabManager?.createTab();
  else if (action === 'split-row') tabManager?.splitActive('row');
  else if (action === 'split-column') tabManager?.splitActive('column');
  else if (action === 'about') openAbout();
});

// The page's <title> drives the native window title.
document.title = `termEd v${window.termed.displayVersion}`;

// About overlay
const aboutOverlay = document.getElementById('ed-about')!;
document.getElementById('ed-about-version')!.textContent = window.termed.version;
// Builds without git report "unknown", which has no commit page to link to.
const aboutCommit = document.getElementById('ed-about-commit')!;
if (window.termed.commit === 'unknown') {
  aboutCommit.textContent = window.termed.commit;
} else {
  const commitLink = document.createElement('a');
  commitLink.href = COMMIT_URL;
  commitLink.textContent = window.termed.commit;
  commitLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.termed.openExternal(COMMIT_URL);
  });
  aboutCommit.appendChild(commitLink);
}

const openAbout = () => aboutOverlay.classList.remove('hidden');
const closeAbout = () => aboutOverlay.classList.add('hidden');

document.getElementById('ed-about-close')!.addEventListener('click', closeAbout);
aboutOverlay.addEventListener('click', (e) => {
  if (e.target === aboutOverlay) closeAbout();
});
document.getElementById('ed-about-link')!.addEventListener('click', (e) => {
  e.preventDefault();
  window.termed.openExternal(CREDITS_URL);
});
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!aboutOverlay.classList.contains('hidden')) closeAbout();
  closeMenu();
});
