import { BACKDROP_DIM_MAX, FONT_SIZE_MAX, FONT_SIZE_MIN, type Settings } from '../settings';
import { fontStack, listInstalledFonts, type InstalledFonts } from './fonts';

export interface SettingsPanelOptions {
  getSettings: () => Settings;
  /** Apply and persist. */
  update: (patch: Partial<Settings>) => void;
  /** Apply without persisting, while a slider is being dragged. */
  preview: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

type Field = HTMLInputElement | HTMLSelectElement;

function option(value: string, label: string): HTMLOptionElement {
  const el = document.createElement('option');
  el.value = value;
  el.textContent = label;
  return el;
}

// The settings overlay. Form controls are named after Settings keys, and each
// one saves as soon as it changes - there's no Save button.
export class SettingsPanel {
  private overlay = document.getElementById('ed-settings')!;
  private panel = document.getElementById('ed-settings-panel')!;
  private form = document.getElementById('ed-settings-form') as HTMLFormElement;
  private fontSelect = this.form.elements.namedItem('fontFamily') as HTMLSelectElement;
  private fontPreview = document.getElementById('ed-settings-font-preview')!;
  private showAllFonts = document.getElementById('ed-settings-all-fonts') as HTMLInputElement;
  private dimValue = document.getElementById('ed-settings-dim-value')!;
  private fonts: InstalledFonts = { all: [], monospace: [] };
  private shellsLoaded = false;

  constructor(private opts: SettingsPanelOptions) {
    const fontSize = this.field('fontSize');
    fontSize.setAttribute('min', String(FONT_SIZE_MIN));
    fontSize.setAttribute('max', String(FONT_SIZE_MAX));
    const backdropDim = this.field('backdropDim');
    backdropDim.setAttribute('max', String(BACKDROP_DIM_MAX));

    this.form.addEventListener('submit', (e) => e.preventDefault());
    this.form.addEventListener('change', (e) => {
      const patch = this.read(e.target as Field);
      if (!patch) return;
      this.opts.update(patch);
      // Show the sanitized result (e.g. a font size clamped into range).
      this.fill(this.opts.getSettings());
    });
    // Live preview while dragging; the change event above saves on release.
    backdropDim.addEventListener('input', () => {
      const patch = this.read(backdropDim);
      if (patch) this.opts.preview(patch);
      this.dimValue.textContent = `${backdropDim.value}%`;
    });
    // Not a setting (no name), just a filter on the font list.
    this.showAllFonts.addEventListener('change', () => this.renderFontOptions());

    document.getElementById('ed-settings-close')!.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  get isOpen(): boolean {
    return !this.overlay.classList.contains('hidden');
  }

  open(): void {
    this.fill(this.opts.getSettings());
    this.overlay.classList.remove('hidden');
    // Pull focus off the terminal so keystrokes stop reaching the shell.
    this.panel.focus();
    void this.loadShells();
    void this.loadFonts();
  }

  close(): void {
    if (!this.isOpen) return;
    this.overlay.classList.add('hidden');
    // Refocusing the terminal blurs any half-edited text field, which fires
    // its change event, so an edit in progress still saves.
    this.opts.onClose();
  }

  private field(name: keyof Settings): Field {
    return this.form.elements.namedItem(name) as Field;
  }

  private read(field: Field): Partial<Settings> | null {
    if (!field.name) return null;
    if (field instanceof HTMLInputElement && field.type === 'checkbox') {
      return { [field.name]: field.checked } as Partial<Settings>;
    }
    if (field.type === 'number' || field.type === 'range') {
      // A cleared number box is NaN; skip it rather than save a default.
      const value = Number(field.value);
      return field.value !== '' && Number.isFinite(value)
        ? ({ [field.name]: value } as Partial<Settings>)
        : null;
    }
    return { [field.name]: field.value } as Partial<Settings>;
  }

  private fill(settings: Settings): void {
    for (const [name, value] of Object.entries(settings)) {
      const field = this.field(name as keyof Settings);
      if (!field) continue;
      if (field instanceof HTMLInputElement && field.type === 'checkbox') {
        field.checked = Boolean(value);
      } else {
        field.value = String(value);
      }
    }
    this.syncFontSelect(settings.fontFamily);
    this.dimValue.textContent = `${settings.backdropDim}%`;
  }

  // Runs on every open: the list itself is cached in fonts.ts, but a failed
  // lookup isn't, so this is also the retry.
  private async loadFonts(): Promise<void> {
    this.fonts = await listInstalledFonts();
    this.renderFontOptions();
  }

  // Monospace families only unless "show all" is checked: a proportional font
  // misaligns every column in a terminal.
  private renderFontOptions(): void {
    const families = this.showAllFonts.checked ? this.fonts.all : this.fonts.monospace;
    this.fontSelect.replaceChildren(
      option('', 'Default (Cascadia Mono)'),
      ...families.map((family) => option(family, family))
    );
    this.syncFontSelect(this.opts.getSettings().fontFamily);
  }

  private syncFontSelect(current: string): void {
    // A saved font missing from the list (uninstalled, or proportional while
    // "show all" is off) still gets an entry, so opening settings never
    // silently swaps it for something else.
    const stale = this.fontSelect.querySelector<HTMLOptionElement>('option[data-unlisted]');
    if (stale && stale.value !== current) stale.remove();
    if (![...this.fontSelect.options].some((o) => o.value === current)) {
      const missing = this.fonts.all.length > 0 && !this.fonts.all.includes(current);
      const extra = option(current, missing ? `${current} (not installed)` : current);
      extra.dataset.unlisted = '';
      this.fontSelect.append(extra);
    }
    this.fontSelect.value = current;
    this.fontPreview.style.fontFamily = fontStack(current);
  }

  private async loadShells(): Promise<void> {
    if (this.shellsLoaded) return;
    this.shellsLoaded = true;
    const list = document.getElementById('ed-shell-list')!;
    for (const shell of await window.termed.detectShells()) {
      const option = document.createElement('option');
      option.value = shell;
      list.appendChild(option);
    }
  }
}
