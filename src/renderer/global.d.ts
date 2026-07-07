import type { TermedApi } from '../preload';

declare global {
  interface Window {
    termed: TermedApi;
  }
}

export {};
