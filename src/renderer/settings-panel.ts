import { BACKDROP_DIM_MAX, FONT_SIZE_MAX, FONT_SIZE_MIN, type Settings } from '../settings';

export interface SettingsPanelOptions {
  getSettings: () => Settings;
  /** Apply and persist. */
  update: (patch: Partial<Settings>) => void;
  /** Apply without persisting, while a slider is being dragged. */
  preview: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

type Field = HTMLInputElement | HTMLSelectElement;

// The settings overlay. Form controls are named after Settings keys, and each
// one saves as soon as it changes - there's no Save button.
export class SettingsPanel {
  private overlay = document.getElementById('ed-settings')!;
  private panel = document.getElementById('ed-settings-panel')!;
  private form = document.getElementById('ed-settings-form') as HTMLFormElement;
  private dimValue = document.getElementById('ed-settings-dim-value')!;
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
    this.dimValue.textContent = `${settings.backdropDim}%`;
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
