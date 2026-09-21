import { type ITerminalOptions } from '@xterm/xterm';
import type { EdQuotes } from './ed-quotes';
import { EdEngine, type EdEngineOptions } from './ed-engine';
import { PaneGroup, type SplitDirection } from './panes';
import type { ContextMenu, MenuEntry } from './context-menu';

// The DOM each tab gets: its own wallpaper backdrop and popup bubble, plus the
// root the pane tree mounts into. Wrapping all three in one element lets a
// single display:none/block toggle show or hide a whole tab's session at once.
export function createSession(): { session: HTMLDivElement; root: HTMLDivElement } {
  const session = document.createElement('div');
  session.className = 'tab-session';
  session.innerHTML = `
    <div class="ed-backdrop"></div>
    <div class="pane-root"></div>
    <div class="ed-bubble hidden">
      <img class="ed-avatar" src="../../assets/ed-1.png" alt="Ed" />
      <div class="ed-bubble-content">
        <div class="ed-bubble-name">Ed</div>
        <div class="ed-bubble-text"></div>
      </div>
    </div>
  `;
  const root = session.querySelector('.pane-root') as HTMLDivElement;
  return { session, root };
}

// Shells often set their OSC title to the full executable path (pwsh does),
// which ellipsizes to a useless "C:\Program Files\WindowsA..." in a tab that
// narrow. Anything that looks like a bare path collapses to its basename;
// real titles ("user@host: ~/proj") are left alone.
function shortenTitle(title: string): string {
  if (!/^(?:[A-Za-z]:[\\/]|\/)/.test(title)) return title;
  const base = title.replace(/^.*[\\/]/, '');
  // A space in the last segment means this isn't a bare path after all.
  if (!base || /\s/.test(base)) return title;
  return base.replace(/\.exe$/i, '');
}

interface Tab {
  id: string;
  panes: PaneGroup;
  ed: EdEngine;
  session: HTMLDivElement;
  tabButton: HTMLButtonElement;
}

/**
 * Where panes get their shells: main's real ptys (window.termed), or demo
 * mode's scripted fakes (DemoPtys). Ids are per pane.
 */
export interface PtyBackend {
  createPty(): Promise<string>;
  closePty(id: string): void;
  input(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  onData(callback: (id: string, data: string) => void): void;
  onExit(callback: (id: string) => void): void;
}

export interface TabManagerOptions {
  ptys: PtyBackend;
  contextMenu: ContextMenu;
  terminalOptions: ITerminalOptions;
  quotes: EdQuotes;
  edOptions: EdEngineOptions;
  onOpenSettings: () => void;
  /** +1 or -1 to step the font size, 0 to reset it. */
  onFontSizeStep: (step: 1 | -1 | 0) => void;
}

// Owns one tab per open shell session. A tab is a PaneGroup (one pty + one
// xterm per pane) plus a single EdEngine - Ed's wallpaper pose, popups, and
// cooldowns are per tab, shared by every pane inside it.
export class TabManager {
  private tabs = new Map<string, Tab>();
  /** pty id -> owning tab, so pty:data can be routed to the right pane. */
  private paneOwner = new Map<string, string>();
  private activeId: string | null = null;
  private tabList: HTMLElement;
  private panesRoot: HTMLElement;
  private counter = 0;
  private nextTabId = 1;

  constructor(private opts: TabManagerOptions) {
    this.tabList = document.getElementById('ed-tablist')!;
    this.panesRoot = document.getElementById('terminal-panes')!;

    this.opts.ptys.onData((paneId, data) => {
      this.tabFor(paneId)?.panes.write(paneId, data);
    });

    this.opts.ptys.onExit((paneId) => {
      const tab = this.tabFor(paneId);
      this.paneOwner.delete(paneId);
      tab?.panes.removePane(paneId);
    });
  }

  async createTab(): Promise<void> {
    const tabId = `tab-${this.nextTabId++}`;
    this.counter += 1;
    const defaultTitle = `Shell ${this.counter}`;

    const { session, root } = createSession();
    this.panesRoot.appendChild(session);

    const ed = new EdEngine(session, this.opts.quotes, this.opts.edOptions);

    const label = document.createElement('span');
    label.className = 'ed-tab-label';
    label.textContent = defaultTitle;

    const close = document.createElement('span');
    close.className = 'ed-tab-close';
    close.innerHTML =
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tabId);
    });

    const tabButton = document.createElement('button');
    tabButton.type = 'button';
    tabButton.className = 'ed-tab';
    tabButton.title = defaultTitle;
    tabButton.append(label, close);
    tabButton.addEventListener('click', () => this.activate(tabId));
    tabButton.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.opts.contextMenu.open(e.clientX, e.clientY, this.tabMenu(tabId));
    });
    // Middle-click closes, same as a browser tab.
    tabButton.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.closeTab(tabId);
      }
    });
    this.tabList.appendChild(tabButton);

    const panes = new PaneGroup(root, {
      terminalOptions: this.opts.terminalOptions,
      createPty: async () => {
        const paneId = await this.opts.ptys.createPty();
        this.paneOwner.set(paneId, tabId);
        return paneId;
      },
      closePty: (paneId) => this.opts.ptys.closePty(paneId),
      input: (paneId, data) => this.opts.ptys.input(paneId, data),
      resize: (paneId, cols, rows) => this.opts.ptys.resize(paneId, cols, rows),
      onActiveInput: (data) => ed.onKeystroke(data),
      onActiveOutput: (data) => ed.onOutput(data),
      // The shell (or whatever's running in it) sets this via OSC 0/2 title
      // escapes - falls back to the plain "Shell N" label when nothing does.
      onTitle: (title) => {
        const text = title ? shortenTitle(title) : defaultTitle;
        label.textContent = text;
        tabButton.title = text;
      },
      onEmpty: () => this.removeTab(tabId),
      onKeyDown: (event) => this.handleKey(event, tabId),
      onContextMenu: (x, y) => this.opts.contextMenu.open(x, y, this.paneMenu(panes)),
    });

    this.tabs.set(tabId, { id: tabId, panes, ed, session, tabButton });
    this.activate(tabId);
    await panes.init();
  }

  activate(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    if (this.activeId === tabId) {
      tab.panes.focusActive();
      return;
    }
    this.activeId = tabId;
    for (const t of this.tabs.values()) {
      const isActive = t.id === tabId;
      t.session.classList.toggle('active', isActive);
      t.tabButton.classList.toggle('active', isActive);
    }
    // Panes measured zero while the tab was hidden, so they need a re-fit now
    // that they have real dimensions again.
    tab.panes.fitAll();
    tab.panes.focusActive();
  }

  closeTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    tab.panes.destroy();
    this.removeTab(tabId);
  }

  closeActive(): void {
    if (this.activeId) this.closeTab(this.activeId);
  }

  async splitActive(dir: SplitDirection): Promise<void> {
    if (this.activeId) await this.tabs.get(this.activeId)?.panes.split(dir);
  }

  // Feeds data to the active pane as if it were typed, through xterm, so the
  // pane's shell and Ed see exactly what real keystrokes produce. Demo mode's
  // script types this way.
  sendInput(data: string): void {
    if (this.activeId) this.tabs.get(this.activeId)?.panes.sendInput(data);
  }

  // Settings changes reach every open tab and pane, not just ones opened
  // afterwards.
  applyOptions(terminalOptions: ITerminalOptions, edOptions: EdEngineOptions): void {
    this.opts.terminalOptions = terminalOptions;
    this.opts.edOptions = edOptions;
    for (const tab of this.tabs.values()) {
      tab.panes.setTerminalOptions(terminalOptions);
      tab.ed.updateOptions(edOptions);
    }
  }

  focusActive(): void {
    if (this.activeId) this.tabs.get(this.activeId)?.panes.focusActive();
  }

  // Has the active tab's Ed speak now, e.g. to show a new popup style.
  previewPopup(): void {
    if (this.activeId) this.tabs.get(this.activeId)?.ed.preview();
  }

  private tabMenu(tabId: string): MenuEntry[] {
    const ids = [...this.tabs.keys()];
    const index = ids.indexOf(tabId);
    return [
      { label: 'New tab', shortcut: 'Ctrl+T', action: () => void this.createTab() },
      'separator',
      { label: 'Close tab', shortcut: 'Ctrl+W', action: () => this.closeTab(tabId) },
      {
        label: 'Close other tabs',
        disabled: ids.length < 2,
        action: () => ids.filter((id) => id !== tabId).forEach((id) => this.closeTab(id)),
      },
      {
        label: 'Close tabs to the right',
        disabled: index === ids.length - 1,
        action: () => ids.slice(index + 1).forEach((id) => this.closeTab(id)),
      },
    ];
  }

  // Right-clicking a pane focuses it first, so these act on the clicked pane.
  private paneMenu(panes: PaneGroup): MenuEntry[] {
    return [
      { label: 'Copy', disabled: !panes.hasSelection(), action: () => void panes.copySelection() },
      { label: 'Paste', action: () => void panes.paste() },
      { label: 'Select all', action: () => panes.selectAll() },
      'separator',
      { label: 'Split right', shortcut: 'Alt+Shift++', action: () => void panes.split('row') },
      { label: 'Split down', shortcut: 'Alt+Shift+-', action: () => void panes.split('column') },
      'separator',
      { label: 'Clear', action: () => panes.clear() },
      { label: 'Close pane', shortcut: 'Ctrl+Shift+W', action: () => panes.closeActive() },
    ];
  }

  private tabFor(paneId: string): Tab | undefined {
    const tabId = this.paneOwner.get(paneId);
    return tabId ? this.tabs.get(tabId) : undefined;
  }

  cycleTab(direction: 1 | -1): void {
    const ids = [...this.tabs.keys()];
    if (ids.length < 2 || !this.activeId) return;
    const index = ids.indexOf(this.activeId);
    this.activate(ids[(index + direction + ids.length) % ids.length]);
  }

  private removeTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    // EdEngine has no other lifecycle hook - a missed destroy() leaks its
    // recurring timer chain forever.
    tab.ed.destroy();
    tab.session.remove();
    tab.tabButton.remove();
    this.tabs.delete(tabId);
    for (const [paneId, owner] of this.paneOwner) {
      if (owner === tabId) this.paneOwner.delete(paneId);
    }

    if (this.activeId === tabId) {
      this.activeId = null;
      const next = [...this.tabs.keys()][0];
      if (next) this.activate(next);
    }

    if (this.tabs.size === 0) window.close();
  }

  // Tab-level shortcuts, consulted by each pane's xterm key handler. Returns
  // true when the event was consumed and must not reach the shell.
  private handleKey(event: KeyboardEvent, tabId: string): boolean {
    if (!(event.metaKey || event.ctrlKey)) return false;
    const key = event.key.toLowerCase();
    if (key === 'tab') {
      event.preventDefault();
      this.cycleTab(event.shiftKey ? -1 : 1);
      return true;
    }
    if (event.shiftKey) return false;
    if (key === 't') {
      event.preventDefault();
      void this.createTab();
      return true;
    }
    if (key === 'w') {
      event.preventDefault();
      this.closeTab(tabId);
      return true;
    }
    if (key === ',') {
      event.preventDefault();
      this.opts.onOpenSettings();
      return true;
    }
    // Zoom keys, same as browsers and Windows Terminal. Shifted combos bail
    // out above, so Ctrl+_ (readline undo) still reaches the shell.
    if (key === '=' || key === '+' || key === '-' || key === '0') {
      event.preventDefault();
      this.opts.onFontSizeStep(key === '-' ? -1 : key === '0' ? 0 : 1);
      return true;
    }
    return false;
  }
}
