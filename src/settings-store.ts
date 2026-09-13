import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeSettings, type Settings } from './settings';

// Both files live in userData (%APPDATA%\termEd, ~/Library/Application
// Support/termEd, ~/.config/termEd), shared by dev and packaged builds.
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
const windowStatePath = () => path.join(app.getPath('userData'), 'window-state.json');

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(file: string, value: unknown): void {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  } catch (e) {
    console.error(`Failed to write ${file}:`, e);
  }
}

let settings: Settings | null = null;

export function getSettings(): Settings {
  // A missing or corrupt file just yields defaults; the next save replaces it.
  settings ??= sanitizeSettings(readJson(settingsPath()));
  return settings;
}

export function updateSettings(patch: unknown): Settings {
  const changes = typeof patch === 'object' && patch !== null ? patch : {};
  settings = sanitizeSettings({ ...getSettings(), ...changes });
  writeJson(settingsPath(), settings);
  return settings;
}

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
}

export function loadWindowState(): WindowState | null {
  const raw = readJson(windowStatePath()) as Partial<WindowState> | null;
  if (!raw) return null;
  const { x, y, width, height, maximized } = raw;
  if (![x, y, width, height].every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return null;
  }
  return { x: x!, y: y!, width: width!, height: height!, maximized: maximized === true };
}

export function saveWindowState(state: WindowState): void {
  writeJson(windowStatePath(), state);
}
