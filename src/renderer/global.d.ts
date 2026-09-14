import type { TermedApi } from '../preload';

// Local Font Access API. Chromium-only, so TypeScript's DOM lib doesn't have it.
interface FontData {
  readonly family: string;
  readonly fullName: string;
  readonly postscriptName: string;
  readonly style: string;
}

declare global {
  interface Window {
    termed: TermedApi;
    queryLocalFonts(): Promise<FontData[]>;
  }
}

export {};
