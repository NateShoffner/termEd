import { Terminal, type ITerminalOptions } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';

export type SplitDirection = 'row' | 'column';

// The split tree for one tab. A leaf is a real terminal (one pty, one xterm);
// a split is a flex container holding exactly two children plus the divider
// between them. Splitting a leaf replaces it in the DOM with a split node that
// re-adopts it, so the tree and the DOM always mirror each other.
interface Leaf {
  kind: 'leaf';
  id: string;
  el: HTMLDivElement;
  term: Terminal;
  fit: FitAddon;
  observer: ResizeObserver;
  parent: Split | null;
  title: string;
}

interface Split {
  kind: 'split';
  dir: SplitDirection;
  el: HTMLDivElement;
  divider: HTMLDivElement;
  children: [PaneNode, PaneNode];
  // Fraction of the split taken by the first child (0..1).
  ratio: number;
  parent: Split | null;
}

type PaneNode = Leaf | Split;

export interface PaneGroupOptions {
  terminalOptions: ITerminalOptions;
  createPty(): Promise<string>;
  closePty(id: string): void;
  input(id: string, data: string): void;
  resize(id: string, cols: number, rows: number): void;
  /** Keystrokes and output from the *active* pane only, so Ed stays coherent. */
  onActiveInput(data: string): void;
  onActiveOutput(data: string): void;
  /** Active pane's title changed (or focus moved to a pane with another title). */
  onTitle(title: string): void;
  /** Last pane in the group closed - the tab has nothing left to show. */
  onEmpty(): void;
  /** Tab-level shortcuts. Return true if the event was consumed. */
  onKeyDown(event: KeyboardEvent): boolean;
  /** A pane was right-clicked (and is now the active pane). */
  onContextMenu(x: number, y: number): void;
}

const MIN_RATIO = 0.1;

export function createPaneEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'terminal-pane';
  return el;
}

export class PaneGroup {
  private leaves = new Map<string, Leaf>();
  private active: Leaf | null = null;

  constructor(
    private container: HTMLElement,
    private opts: PaneGroupOptions
  ) {}

  /** Creates the group's first pane. */
  async init(): Promise<void> {
    const leaf = await this.createLeaf();
    this.container.appendChild(leaf.el);
    this.focus(leaf);
  }

  write(paneId: string, data: string): void {
    const leaf = this.leaves.get(paneId);
    if (!leaf) return;
    leaf.term.write(data);
    if (leaf === this.active) this.opts.onActiveOutput(data);
  }

  focusActive(): void {
    this.active?.term.focus();
  }

  /** Feeds data to the active pane as if typed (see TabManager.sendInput). */
  sendInput(data: string): void {
    this.active?.term.input(data);
  }

  // Context menu actions, all on the active pane.
  hasSelection(): boolean {
    return this.active?.term.hasSelection() ?? false;
  }

  async copySelection(): Promise<void> {
    const text = this.active?.term.getSelection();
    if (text) await navigator.clipboard.writeText(text);
    this.focusActive();
  }

  async paste(): Promise<void> {
    // term.paste, not input: it applies bracketed paste when the shell asked
    // for it, so multi-line pastes don't run line by line.
    const text = await navigator.clipboard.readText();
    if (text) this.active?.term.paste(text);
    this.focusActive();
  }

  selectAll(): void {
    this.active?.term.selectAll();
    this.focusActive();
  }

  clear(): void {
    this.active?.term.clear();
    this.focusActive();
  }

  /** Re-fits every pane - needed after the tab becomes visible again. */
  fitAll(): void {
    for (const leaf of this.leaves.values()) this.fitLeaf(leaf);
  }

  /** Settings changed: restyle every pane, and use the new options for future splits. */
  setTerminalOptions(options: ITerminalOptions): void {
    this.opts.terminalOptions = options;
    for (const leaf of this.leaves.values()) {
      leaf.term.options.fontFamily = options.fontFamily;
      leaf.term.options.fontSize = options.fontSize;
      leaf.term.options.cursorStyle = options.cursorStyle;
    }
    // A font change resizes the cells but not the pane element, so the
    // ResizeObserver won't fire. Hidden tabs skip this and refit on activate.
    this.fitAll();
  }

  async split(dir: SplitDirection): Promise<void> {
    const target = this.active;
    if (!target) return;

    const leaf = await this.createLeaf();
    // The target may have gone away while the pty was being spawned.
    if (!this.leaves.has(target.id)) {
      this.opts.closePty(leaf.id);
      this.disposeLeaf(leaf);
      return;
    }

    const divider = document.createElement('div');
    divider.className = `pane-divider pane-divider-${dir}`;

    const el = document.createElement('div');
    el.className = `pane-split pane-split-${dir}`;

    const split: Split = {
      kind: 'split',
      dir,
      el,
      divider,
      children: [target, leaf],
      ratio: 0.5,
      parent: target.parent,
    };

    // Swap the target out for the split in whichever slot it occupied - the
    // new split has to inherit the target's share of its parent, or it
    // collapses to min-content when the parent is itself a split.
    const parent = target.parent;
    el.style.flex = target.el.style.flex;
    if (parent) {
      parent.children[parent.children.indexOf(target)] = split;
      parent.el.replaceChild(el, target.el);
    } else {
      this.container.replaceChild(el, target.el);
    }

    target.parent = split;
    leaf.parent = split;
    el.append(target.el, divider, leaf.el);
    this.applyRatio(split);
    this.attachDividerDrag(split);

    this.focus(leaf);
  }

  /** Splits along whichever axis leaves the two panes closest to square. */
  async splitAuto(): Promise<void> {
    const el = this.active?.el;
    const dir: SplitDirection = !el || el.clientWidth >= el.clientHeight ? 'row' : 'column';
    await this.split(dir);
  }

  closeActive(): void {
    if (this.active) this.opts.closePty(this.active.id);
  }

  /** A pty exited (or was killed) - tear its pane out of the tree. */
  removePane(paneId: string): void {
    const leaf = this.leaves.get(paneId);
    if (!leaf) return;
    const wasActive = leaf === this.active;
    const parent = leaf.parent;

    this.disposeLeaf(leaf);

    if (!parent) {
      this.active = null;
      this.opts.onEmpty();
      return;
    }

    // The surviving sibling takes the split's place entirely.
    const sibling = parent.children[parent.children[0] === leaf ? 1 : 0];
    const grandparent = parent.parent;
    sibling.parent = grandparent;
    if (grandparent) {
      grandparent.children[grandparent.children.indexOf(parent)] = sibling;
      grandparent.el.replaceChild(sibling.el, parent.el);
      this.applyRatio(grandparent);
    } else {
      this.container.replaceChild(sibling.el, parent.el);
      sibling.el.style.flex = '';
    }
    parent.el.remove();

    if (wasActive) this.focus(this.firstLeaf(sibling));
  }

  /** Moves focus to the nearest pane in a direction, geometrically. */
  focusDirection(dx: number, dy: number): void {
    const from = this.active;
    if (!from) return;
    const a = from.el.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;

    let best: Leaf | null = null;
    let bestDistance = Infinity;
    for (const leaf of this.leaves.values()) {
      if (leaf === from) continue;
      const b = leaf.el.getBoundingClientRect();
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      const along = dx ? (bx - ax) * dx : (by - ay) * dy;
      if (along <= 0) continue;
      // Weight the off-axis offset heavily so we don't jump across the layout.
      const across = dx ? Math.abs(by - ay) : Math.abs(bx - ax);
      const distance = along + across * 3;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = leaf;
      }
    }
    if (best) this.focus(best);
  }

  destroy(): void {
    for (const leaf of [...this.leaves.values()]) {
      this.opts.closePty(leaf.id);
      this.disposeLeaf(leaf);
    }
    this.active = null;
  }

  private async createLeaf(): Promise<Leaf> {
    const id = await this.opts.createPty();
    const el = createPaneEl();

    const term = new Terminal(this.opts.terminalOptions);
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(el);
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      term.loadAddon(webgl);
    } catch (e) {
      console.warn('WebGL renderer unavailable, using DOM renderer:', e);
    }

    const leaf: Leaf = {
      kind: 'leaf',
      id,
      el,
      term,
      fit,
      parent: null,
      title: '',
      // Panes resize for many reasons (window, divider drag, sibling closing,
      // tab becoming visible); observing the element covers all of them.
      observer: new ResizeObserver(() => this.fitLeaf(leaf)),
    };

    term.onData((data) => {
      this.opts.input(id, data);
      if (leaf === this.active) this.opts.onActiveInput(data);
    });

    term.onTitleChange((title) => {
      leaf.title = title.trim();
      if (leaf === this.active) this.opts.onTitle(leaf.title);
    });

    term.attachCustomKeyEventHandler((event) => this.handleKey(event));
    // xterm swallows the mousedown, so focus tracking has to be explicit.
    el.addEventListener('mousedown', () => this.focus(leaf), true);
    el.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.focus(leaf);
      this.opts.onContextMenu(event.clientX, event.clientY);
    });

    leaf.observer.observe(el);
    this.leaves.set(id, leaf);
    return leaf;
  }

  private disposeLeaf(leaf: Leaf): void {
    leaf.observer.disconnect();
    leaf.term.dispose();
    leaf.el.remove();
    this.leaves.delete(leaf.id);
  }

  private focus(leaf: Leaf | null): void {
    if (!leaf) return;
    this.active = leaf;
    for (const other of this.leaves.values()) {
      other.el.classList.toggle('active-pane', other === leaf);
    }
    leaf.term.focus();
    this.opts.onTitle(leaf.title);
  }

  private firstLeaf(node: PaneNode): Leaf {
    return node.kind === 'leaf' ? node : this.firstLeaf(node.children[0]);
  }

  private fitLeaf(leaf: Leaf): void {
    // A hidden tab (or a pane mid-teardown) measures zero - fitting then would
    // clamp the pty to 1x1 and reflow the shell's output for nothing.
    if (leaf.el.clientWidth < 2 || leaf.el.clientHeight < 2) return;
    leaf.fit.fit();
    this.opts.resize(leaf.id, leaf.term.cols, leaf.term.rows);
  }

  private applyRatio(split: Split): void {
    split.children[0].el.style.flex = `${split.ratio} 1 0`;
    split.children[1].el.style.flex = `${1 - split.ratio} 1 0`;
  }

  private attachDividerDrag(split: Split): void {
    split.divider.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      split.divider.setPointerCapture(event.pointerId);
      split.el.classList.add('resizing');

      const onMove = (move: PointerEvent) => {
        const rect = split.el.getBoundingClientRect();
        const raw =
          split.dir === 'row'
            ? (move.clientX - rect.left) / rect.width
            : (move.clientY - rect.top) / rect.height;
        split.ratio = Math.min(1 - MIN_RATIO, Math.max(MIN_RATIO, raw));
        this.applyRatio(split);
      };

      const onUp = () => {
        split.divider.removeEventListener('pointermove', onMove);
        split.divider.removeEventListener('pointerup', onUp);
        split.divider.removeEventListener('pointercancel', onUp);
        split.el.classList.remove('resizing');
      };

      split.divider.addEventListener('pointermove', onMove);
      split.divider.addEventListener('pointerup', onUp);
      split.divider.addEventListener('pointercancel', onUp);
    });
  }

  // Pane shortcuts have to be intercepted here rather than on a window-level
  // keydown listener - xterm forwards the keystroke to the pty first, so a
  // window listener would fire only after the shell already saw the character.
  private handleKey(event: KeyboardEvent): boolean {
    if (event.type !== 'keydown') return true;

    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.shiftKey) {
        const key = event.key;
        if (key === '+' || key === '=') {
          event.preventDefault();
          void this.split('row');
          return false;
        }
        if (key === '_' || key === '-') {
          event.preventDefault();
          void this.split('column');
          return false;
        }
        if (key.toLowerCase() === 'd') {
          event.preventDefault();
          void this.splitAuto();
          return false;
        }
      } else {
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        const move = moves[event.key];
        if (move) {
          event.preventDefault();
          this.focusDirection(move[0], move[1]);
          return false;
        }
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'w') {
      event.preventDefault();
      this.closeActive();
      return false;
    }

    return !this.opts.onKeyDown(event);
  }
}
