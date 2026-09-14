// User settings, shared by main (persistence, shell spawning, window bounds)
// and the renderer (terminal options, Ed's pacing, appearance). No Node or
// DOM imports here: both bundles include this file.

export const CURSOR_STYLES = ['block', 'bar', 'underline'] as const;
export type CursorStyle = (typeof CURSOR_STYLES)[number];

export const ED_CHATTINESS_LEVELS = ['quiet', 'normal', 'chatty'] as const;
export type EdChattiness = (typeof ED_CHATTINESS_LEVELS)[number];

export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 32;
export const BACKDROP_DIM_MAX = 90;

export interface Settings {
  /** Empty means the built-in font stack. */
  fontFamily: string;
  fontSize: number;
  cursorStyle: CursorStyle;
  /** Empty means auto-detect. Applies to new tabs. */
  shell: string;
  /** Empty means the home folder. Applies to new tabs. */
  startingDirectory: string;
  edChattiness: EdChattiness;
  /** Opacity of the tint behind the terminal text, in percent. */
  backdropDim: number;
  rememberWindowBounds: boolean;
  /** Installed builds only: check on startup and every few hours. */
  autoCheckUpdates: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  fontFamily: '',
  fontSize: 15,
  cursorStyle: 'block',
  shell: '',
  startingDirectory: '',
  edChattiness: 'normal',
  backdropDim: 45,
  rememberWindowBounds: true,
  autoCheckUpdates: true,
};

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value.trim().slice(0, 1000) : fallback;

// Paths pasted from Explorer's "Copy as path" come wrapped in quotes.
const pathText = (value: unknown, fallback: string): string =>
  text(value, fallback).replace(/^"(.*)"$/, '$1');

const integer = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const flag = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

// Settings arrive from disk and over IPC, so every field is validated rather
// than trusted. Unknown keys are dropped; bad values fall back to defaults.
export function sanitizeSettings(raw: unknown): Settings {
  const input = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    fontFamily: text(input.fontFamily, d.fontFamily),
    fontSize: integer(input.fontSize, FONT_SIZE_MIN, FONT_SIZE_MAX, d.fontSize),
    cursorStyle: oneOf(input.cursorStyle, CURSOR_STYLES, d.cursorStyle),
    shell: pathText(input.shell, d.shell),
    startingDirectory: pathText(input.startingDirectory, d.startingDirectory),
    edChattiness: oneOf(input.edChattiness, ED_CHATTINESS_LEVELS, d.edChattiness),
    backdropDim: integer(input.backdropDim, 0, BACKDROP_DIM_MAX, d.backdropDim),
    rememberWindowBounds: flag(input.rememberWindowBounds, d.rememberWindowBounds),
    autoCheckUpdates: flag(input.autoCheckUpdates, d.autoCheckUpdates),
  };
}
