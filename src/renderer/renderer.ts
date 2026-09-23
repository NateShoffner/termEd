import { type ITerminalOptions } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { ED_QUOTES } from './ed-quotes';
import { ED_CHATTINESS, type EdEngineOptions } from './ed-engine';
import { DemoPtys, runDemo } from './demo';
import { TabManager } from './tab-manager';
import { ContextMenu } from './context-menu';
import { SettingsPanel } from './settings-panel';
import { fontStack } from './fonts';
import { initUpdateUi } from './update-ui';
import { COMMIT_URL, CREDITS_URL } from '../links';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from '../settings';

// Font family, size, and cursor style come from settings (terminalOptionsFor).
const TERMINAL_OPTIONS: ITerminalOptions = {
  allowTransparency: true,
  cursorBlink: true,
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
const ED_PHOTOS = Array.from({ length: 10 }, (_, i) => `../../assets/ed-${i + 1}.webp`);

// Decode every pose up front so swaps never stutter.
for (const photo of ED_PHOTOS) {
  const img = new Image();
  img.src = photo;
  img.decode().catch(() => {});
}

function terminalOptionsFor(settings: Settings): ITerminalOptions {
  return {
    ...TERMINAL_OPTIONS,
    fontFamily: fontStack(settings.fontFamily),
    fontSize: settings.fontSize,
    cursorStyle: settings.cursorStyle,
  };
}

function edOptionsFor(settings: Settings): EdEngineOptions {
  return {
    photos: ED_PHOTOS,
    platform: window.termed.platform,
    popups: settings.edPopups,
    // Demo pacing: reactions land close together, and the idle check-in fires
    // shortly after the script ends (14s clears every mid-demo pause).
    ...(window.termed.demo
      ? { reactionCooldown: 2_500, globalCooldown: 4_000, idleThreshold: 14_000 }
      : ED_CHATTINESS[settings.edChattiness]),
  };
}

function applyAppearance(settings: Settings): void {
  document.documentElement.style.setProperty('--pane-tint', String(settings.backdropDim / 100));
  document.documentElement.classList.toggle('ed-no-backdrop', !settings.edBackdrop);
  document.documentElement.dataset.edPopup = settings.edPopupStyle;
}

let tabManager: TabManager | null = null;
let settingsPanel: SettingsPanel | null = null;

void window.termed.getSettings().then((initialSettings) => {
  let settings = initialSettings;
  applyAppearance(settings);

  // Applied locally first (sanitized by the same rules main uses), then
  // persisted, so rapid repeats like Ctrl+= build on each other instead of
  // racing the IPC round trip.
  const updateSettings = (patch: Partial<Settings>) => {
    settings = sanitizeSettings({ ...settings, ...patch });
    applyAppearance(settings);
    tabManager?.applyOptions(terminalOptionsFor(settings), edOptionsFor(settings));
    window.termed.setSettings(settings);
    // Show a newly picked popup style now rather than whenever Ed next talks.
    if (patch.edPopupStyle) tabManager?.previewPopup();
  };

  // Demo mode runs the real tab and pane UI on scripted fake shells.
  const demoPtys = window.termed.demo ? new DemoPtys() : null;
  tabManager = new TabManager({
    ptys: demoPtys ?? window.termed,
    contextMenu: new ContextMenu(),
    terminalOptions: terminalOptionsFor(settings),
    quotes: ED_QUOTES,
    edOptions: edOptionsFor(settings),
    onOpenSettings: () => settingsPanel?.open(),
    onFontSizeStep: (step) =>
      updateSettings({
        fontSize: step === 0 ? DEFAULT_SETTINGS.fontSize : settings.fontSize + step,
      }),
  });

  settingsPanel = new SettingsPanel({
    getSettings: () => settings,
    update: updateSettings,
    preview: (patch) => applyAppearance({ ...settings, ...patch }),
    onClose: () => tabManager?.focusActive(),
  });

  document
    .getElementById('ed-new-tab')!
    .addEventListener('click', () => void tabManager!.createTab());
  document
    .getElementById('ed-settings-btn')!
    .addEventListener('click', () => settingsPanel?.open());

  void tabManager.createTab().then(() => {
    if (!demoPtys) return;
    // scripts/record-demo.mjs watches for this to know when to stop recording.
    void runDemo(tabManager!, demoPtys).then(() =>
      document.documentElement.setAttribute('data-demo-done', '')
    );
  });
});

// Tab bar dropdown menu
const menu = document.getElementById('ed-menu')!;
const menuButton = document.getElementById('ed-tab-menu')!;
const closeMenu = () => menu.classList.add('hidden');
const runUpdateAction = initUpdateUi();

menuButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const opening = menu.classList.contains('hidden');
  menu.classList.toggle('hidden');
  if (!opening) return;
  // The button follows the last tab, so the menu opens under it (kept on
  // screen) instead of at a fixed corner.
  const button = menuButton.getBoundingClientRect();
  const left = Math.min(button.left, window.innerWidth - menu.offsetWidth - 8);
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${button.bottom + 4}px`;
});

document.addEventListener('click', (e) => {
  if (!menu.classList.contains('hidden') && !menu.contains(e.target as Node)) closeMenu();
});
// A right-click doesn't fire click, so opening a context menu closes this too.
document.addEventListener('contextmenu', () => closeMenu());

menu.addEventListener('click', (e) => {
  const action = (e.target as HTMLElement).closest('button')?.dataset.action;
  if (!action) return;
  closeMenu();
  if (action === 'new-tab') void tabManager?.createTab();
  else if (action === 'split-row') void tabManager?.splitActive('row');
  else if (action === 'split-column') void tabManager?.splitActive('column');
  else if (action === 'settings') settingsPanel?.open();
  else if (action === 'update') runUpdateAction();
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

document.getElementById('ed-about-btn')!.addEventListener('click', openAbout);

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
