export interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  action: () => void;
}

export type MenuEntry = MenuItem | 'separator';

// The shared right-click menu for terminal panes and tabs. Styled like the tab
// bar's dropdown (.ed-menu) and rebuilt from a fresh entry list on every open,
// so items like Copy reflect the state at the moment of the click.
export class ContextMenu {
  private el = document.getElementById('ed-context-menu')!;

  constructor() {
    // Capture phase, so pressing anywhere else closes the menu before that
    // press does anything, including a right-click that opens the next menu.
    document.addEventListener(
      'mousedown',
      (e) => {
        if (!this.el.contains(e.target as Node)) this.close();
      },
      true
    );
    // Capture phase too: xterm stops propagation of keys it handles (Escape
    // included), so a bubbling listener never hears Escape while a terminal
    // has focus. Swallowed while the menu is open, so the shell doesn't also
    // get an ESC.
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape' || this.el.classList.contains('hidden')) return;
        e.preventDefault();
        e.stopPropagation();
        this.close();
      },
      true
    );
    window.addEventListener('blur', () => this.close());
    window.addEventListener('resize', () => this.close());
  }

  open(x: number, y: number, entries: MenuEntry[]): void {
    this.el.replaceChildren(
      ...entries.map((entry) => (entry === 'separator' ? separator() : this.item(entry)))
    );
    this.el.classList.remove('hidden');
    // Opens down and right from the pointer, flipping where it would run off
    // the window.
    const { offsetWidth: width, offsetHeight: height } = this.el;
    const left = x + width > window.innerWidth - 4 ? x - width : x;
    const top = y + height > window.innerHeight - 4 ? y - height : y;
    this.el.style.left = `${Math.max(4, left)}px`;
    this.el.style.top = `${Math.max(4, top)}px`;
  }

  close(): void {
    this.el.classList.add('hidden');
  }

  private item({ label, shortcut, disabled, action }: MenuItem): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'menuitem');
    button.disabled = Boolean(disabled);
    button.textContent = label;
    if (shortcut) {
      const kbd = document.createElement('kbd');
      kbd.textContent = shortcut;
      button.append(kbd);
    }
    button.addEventListener('click', () => {
      this.close();
      action();
    });
    return button;
  }
}

function separator(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'ed-menu-sep';
  return el;
}
