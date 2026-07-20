import { Terminal, type ITerminalOptions } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import type { EdQuotes } from './ed-quotes';
import { EdEngine, type EdEngineOptions } from './ed-engine';

// The DOM each tab gets: its own wallpaper backdrop and popup bubble, plus
// the xterm mount point. Wrapping all three in one element lets a single
// display:none/block toggle show or hide a whole tab's session at once.
export function createSession(): { session: HTMLDivElement; pane: HTMLDivElement } {
  const session = document.createElement('div');
  session.className = 'tab-session';
  session.innerHTML = `
    <div class="ed-backdrop"></div>
    <div class="terminal-pane"></div>
    <div class="ed-bubble hidden">
      <img class="ed-avatar" src="../../assets/ed-1.png" alt="Ed" />
      <div class="ed-bubble-content">
        <div class="ed-bubble-name">Ed</div>
        <div class="ed-bubble-text"></div>
      </div>
    </div>
  `;
  const pane = session.querySelector('.terminal-pane') as HTMLDivElement;
  return { session, pane };
}

interface Tab {
  id: string;
  term: Terminal;
  fitAddon: FitAddon;
  ed: EdEngine;
  session: HTMLDivElement;
  tabButton: HTMLButtonElement;
}

export interface TabManagerOptions {
  terminalOptions: ITerminalOptions;
  quotes: EdQuotes;
  edOptions: EdEngineOptions;
}

// Owns one xterm instance + pty + EdEngine per open tab. Each tab's wallpaper
// pose, popups, and cooldowns are fully independent - Ed on tab 2 has no idea
// what happened on tab 1.
export class TabManager {
  private tabs = new Map<string, Tab>();
  private activeId: string | null = null;
  private tabList: HTMLElement;
  private panesRoot: HTMLElement;
  private counter = 0;

  constructor(private opts: TabManagerOptions) {
    this.tabList = document.getElementById('ed-tablist')!;
    this.panesRoot = document.getElementById('terminal-panes')!;

    window.termed.onData((tabId, data) => {
      const tab = this.tabs.get(tabId);
      if (!tab) return;
      tab.term.write(data);
      tab.ed.onOutput(data);
    });

    window.termed.onExit((tabId) => this.removeTab(tabId));

    window.addEventListener('resize', () => this.fitActive());
  }

  async createTab(): Promise<void> {
    const tabId = await window.termed.createTab();
    this.counter += 1;

    const { session, pane } = createSession();
    this.panesRoot.appendChild(session);

    const term = new Terminal(this.opts.terminalOptions);
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(pane);
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      term.loadAddon(webgl);
    } catch (e) {
      console.warn('WebGL renderer unavailable, using DOM renderer:', e);
    }

    const ed = new EdEngine(session, this.opts.quotes, this.opts.edOptions);

    term.onData((data) => {
      window.termed.input(tabId, data);
      ed.onKeystroke(data);
    });

    // Intercept tab shortcuts before xterm forwards them to the shell.
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown' || !(event.metaKey || event.ctrlKey)) return true;
      const key = event.key.toLowerCase();
      if (key === 't') {
        event.preventDefault();
        void this.createTab();
        return false;
      }
      if (key === 'w') {
        event.preventDefault();
        this.closeTab(tabId);
        return false;
      }
      if (key === 'tab') {
        event.preventDefault();
        this.cycleTab(event.shiftKey ? -1 : 1);
        return false;
      }
      return true;
    });

    const defaultTitle = `Shell ${this.counter}`;
    const label = document.createElement('span');
    label.className = 'ed-tab-label';
    label.textContent = defaultTitle;

    const close = document.createElement('span');
    close.className = 'ed-tab-close';
    close.textContent = '×';
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
    this.tabList.appendChild(tabButton);

    // The shell (or whatever's running in it) sets this via OSC 0/2 title
    // escapes - falls back to the plain "Shell N" label when nothing does.
    term.onTitleChange((title) => {
      const text = title.trim() || defaultTitle;
      label.textContent = text;
      tabButton.title = text;
    });

    this.tabs.set(tabId, { id: tabId, term, fitAddon, ed, session, tabButton });
    this.activate(tabId);
  }

  activate(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab || this.activeId === tabId) {
      tab?.term.focus();
      return;
    }
    this.activeId = tabId;
    for (const t of this.tabs.values()) {
      const isActive = t.id === tabId;
      t.session.classList.toggle('active', isActive);
      t.tabButton.classList.toggle('active', isActive);
    }
    this.fitActive();
    tab.term.focus();
  }

  closeTab(tabId: string): void {
    window.termed.closeTab(tabId);
  }

  closeActive(): void {
    if (this.activeId) this.closeTab(this.activeId);
  }

  private cycleTab(direction: 1 | -1): void {
    const ids = [...this.tabs.keys()];
    if (ids.length < 2 || !this.activeId) return;
    const index = ids.indexOf(this.activeId);
    const next = ids[(index + direction + ids.length) % ids.length];
    this.activate(next);
  }

  private removeTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    tab.ed.destroy();
    tab.term.dispose();
    tab.session.remove();
    tab.tabButton.remove();
    this.tabs.delete(tabId);

    if (this.activeId === tabId) {
      this.activeId = null;
      const next = [...this.tabs.keys()][0];
      if (next) this.activate(next);
    }

    if (this.tabs.size === 0) window.close();
  }

  private fitActive(): void {
    const tab = this.activeId ? this.tabs.get(this.activeId) : undefined;
    if (!tab) return;
    tab.fitAddon.fit();
    window.termed.resize(tab.id, tab.term.cols, tab.term.rows);
  }
}
