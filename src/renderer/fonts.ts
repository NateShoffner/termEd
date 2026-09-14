// Nerd Font families come first so prompt themes (oh-my-posh, starship) get
// their icon glyphs instead of tofu boxes. Nerd Fonts has shipped several
// naming schemes over its versions; a family that isn't installed just falls
// through to the next one.
export const DEFAULT_FONT_STACK =
  "'CaskaydiaCove Nerd Font Mono', 'CaskaydiaCove NFM', 'CaskaydiaCove Nerd Font', 'CaskaydiaCove NF', 'Symbols Nerd Font Mono', 'Cascadia Mono', 'Cascadia Code', Consolas, 'Courier New', monospace";

const quoteFamily = (family: string) => `"${family.replace(/["\\]/g, '\\$&')}"`;

// A chosen font goes in front of the built-in stack, so one that's since been
// uninstalled still lands on a monospace face.
export function fontStack(family: string): string {
  return family ? `${quoteFamily(family)}, ${DEFAULT_FONT_STACK}` : DEFAULT_FONT_STACK;
}

export interface InstalledFonts {
  all: string[];
  monospace: string[];
}

let installed: Promise<InstalledFonts> | null = null;

// Font families installed on this machine, via the Local Font Access API
// (Electron grants it without a permission prompt). Cached: the scan measures
// every family, and installed fonts rarely change while the app is open.
export function listInstalledFonts(): Promise<InstalledFonts> {
  installed ??= whenVisible()
    .then(() => window.queryLocalFonts())
    .then((faces) => {
      const all = [...new Set(faces.map((face) => face.family))].sort((a, b) =>
        a.localeCompare(b)
      );
      return { all, monospace: all.filter(isMonospace) };
    })
    .catch((e) => {
      // Not cached, so the next time settings opens tries again.
      installed = null;
      console.warn('Installed font list unavailable:', e);
      return { all: [], monospace: [] };
    });
  return installed;
}

// queryLocalFonts rejects while the page is hidden: minimized, or on Windows,
// fully covered by other windows.
function whenVisible(): Promise<void> {
  if (document.visibilityState === 'visible') return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    document.addEventListener('visibilitychange', onChange);
  });
}

let measure: CanvasRenderingContext2D | null = null;

// Narrow and wide glyphs measure the same in a monospace face. A family the
// canvas can't resolve (or a symbol font with no Latin glyphs) falls back to
// serif and fails, which is the right answer for a terminal anyway.
function isMonospace(family: string): boolean {
  const ctx = (measure ??= document.createElement('canvas').getContext('2d')!);
  ctx.font = `16px ${quoteFamily(family)}, serif`;
  const width = ctx.measureText('i').width;
  return (
    width > 0 &&
    ['W', 'm', '0', '.'].every((ch) => Math.abs(ctx.measureText(ch).width - width) < 0.01)
  );
}
