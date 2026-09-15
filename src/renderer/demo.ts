import { getMotd } from '../motd';
import type { PtyBackend, TabManager } from './tab-manager';

// Demo mode: the real UI (tabs, split panes, settings, Ed) on scripted fake
// shells. DemoPtys stands in for main's ptys behind TabManager, and runDemo()
// drives the app the way a user would, so everything on screen, Ed's
// reactions included, comes from the same code paths as a real session.

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

const PROMPT = '\x1b[1;32m➜\x1b[0m \x1b[36mapp\x1b[0m \x1b[90mgit:(main)\x1b[0m ';
const RED = (s: string) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[90m${s}\x1b[0m`;
const clock = () => DIM(`[${new Date().toLocaleTimeString('en-US', { hour12: false })}]`);

const MOTD_COLORS: Record<string, string> = {
  Cyan: '\x1b[1;36m',
  DarkGray: '\x1b[90m',
  Yellow: '\x1b[33m',
};

const TYPE_ERROR = [
  RED("src/engine.ts:42:18 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'."),
  '',
  '42   applyHype(level);',
  RED('                ~~~~~'),
];

// What a command does in a fake shell. Resolves once its output is done;
// resolving to true means it keeps running (a watcher), so no prompt returns.
//
// Ed reacts once a command's output pauses for outputSettleMs (700ms), so a
// gap longer than that before an error means he reacts without seeing it.
// Keep pauses before anything he should react to under that.
type Command = (shell: FakeShell) => Promise<boolean | void>;

const COMMANDS: Record<string, Command> = {
  'npm install': async (shell) => {
    await sleep(600);
    await shell.lines([
      '',
      'added 142 packages, and audited 143 packages in 3s',
      '',
      '23 packages are looking for funding',
      '',
      'found 0 vulnerabilities',
    ]);
  },

  'npm run build': async (shell) => {
    await shell.lines(['', DIM('> app@1.0.0 build'), DIM('> tsc -p .'), '']);
    await sleep(500);
    if (!shell.demo.fixed) await shell.lines([...TYPE_ERROR, '', RED('Found 1 error in src/engine.ts:42')]);
  },

  'npm run build -- --watch': async (shell) => {
    await shell.lines(['', DIM('> app@1.0.0 build'), DIM('> tsc -p . --watch'), '']);
    await sleep(500);
    await shell.lines([`${clock()} Starting compilation in watch mode...`, '']);
    await sleep(500);
    if (shell.demo.fixed) {
      await shell.lines([`${clock()} ${GREEN('Found 0 errors.')} Watching for file changes.`]);
    } else {
      await shell.lines([...TYPE_ERROR, '', `${clock()} Found 1 error. Watching for file changes.`]);
    }
    shell.onSave = async () => {
      await shell.lines(['', `${clock()} File change detected. Starting incremental compilation...`, '']);
      await sleep(1100);
      await shell.lines([`${clock()} ${GREEN('Found 0 errors.')} Watching for file changes.`]);
    };
    return true;
  },

  'npm test': async (shell) => {
    await shell.lines(['', DIM('> app@1.0.0 test'), DIM('> vitest run'), '']);
    await sleep(500);
    if (shell.demo.fixed) {
      await shell.lines([
        ` ${GREEN('✓')} src/motd.test.ts (4 tests) 12ms`,
        ` ${GREEN('✓')} src/engine.test.ts (9 tests) 31ms`,
        '',
        ` Test Files  ${GREEN('2 passed')} (2)`,
        `      Tests  ${GREEN('13 passed')} (13)`,
      ]);
    } else {
      await shell.lines([
        ` ${GREEN('✓')} src/motd.test.ts (4 tests) 12ms`,
        ` ${RED('×')} src/engine.test.ts (9 tests | 1 failed) 34ms`,
        '',
        ` Test Files  ${RED('1 failed')} | ${GREEN('1 passed')} (2)`,
        `      Tests  ${RED('1 failed')} | ${GREEN('12 passed')} (13)`,
      ]);
    }
  },

  'git commit -am "fix: believe in yourself"': async (shell) => {
    await sleep(300);
    await shell.lines([
      '[main 3f81d2c] fix: believe in yourself',
      ' 1 file changed, 1 insertion(+), 1 deletion(-)',
    ]);
  },

  'git push': async (shell) => {
    await sleep(600);
    await shell.lines([
      'Enumerating objects: 7, done.',
      'Counting objects: 100% (7/7), done.',
      'Writing objects: 100% (4/4), 412 bytes | 412.00 KiB/s, done.',
      'To github.com:you/app.git',
      '   8d21f3a..3f81d2c  main -> main',
    ]);
  },

  // Real ed opens silently; Ed's easter egg reacts to the command itself.
  ed: async () => {},
};

// A pretend zsh: echoes typing, handles backspace and Enter, sets the window
// title like oh-my-zsh does, and plays COMMANDS.
class FakeShell {
  /** A running watcher's reaction to DemoPtys.saveFix(). */
  onSave: (() => Promise<void>) | null = null;
  private line = '';
  private busy = false;
  private closed = false;

  constructor(
    readonly demo: DemoPtys,
    private emit: (data: string) => void
  ) {}

  start(withMotd: boolean): void {
    if (withMotd) {
      for (const line of getMotd(window.termed.displayVersion)) {
        this.write(`  ${MOTD_COLORS[line.color] ?? ''}${line.text}\x1b[0m\r\n`);
      }
      this.write('\r\n');
    }
    this.prompt();
  }

  close(): void {
    this.closed = true;
    this.onSave = null;
  }

  write(data: string): void {
    if (!this.closed) this.emit(data);
  }

  async lines(lines: string[]): Promise<void> {
    for (const line of lines) {
      this.write(`${line}\r\n`);
      await sleep(rand(20, 70));
    }
  }

  /** Returns the command's run when this input pressed Enter. */
  input(data: string): Promise<void> | null {
    // A running command owns the terminal; typing into it does nothing.
    if (this.busy) return null;
    let run: Promise<void> | null = null;
    for (const ch of data) {
      if (ch === '\r') {
        this.write('\r\n');
        run = this.run(this.line.trim());
        this.line = '';
      } else if (ch === '\x7f') {
        if (this.line) {
          this.line = this.line.slice(0, -1);
          this.write('\b \b');
        }
      } else if (ch >= ' ') {
        this.line += ch;
        this.write(ch);
      }
    }
    return run;
  }

  private prompt(): void {
    this.write(`\x1b]0;~/app\x07${PROMPT}`);
  }

  private async run(command: string): Promise<void> {
    if (!command) return this.prompt();
    const handler = COMMANDS[command];
    if (!handler) {
      this.write(`zsh: command not found: ${command.split(/\s+/)[0]}\r\n`);
      return this.prompt();
    }
    this.busy = true;
    this.write(`\x1b]0;${command}\x07`);
    const keepsRunning = await handler(this);
    if (keepsRunning || this.closed) return;
    this.busy = false;
    this.prompt();
  }
}

// Demo mode's PtyBackend: one FakeShell per pane.
export class DemoPtys implements PtyBackend {
  /** Whether the script has "saved" the fix the build and tests are waiting on. */
  fixed = false;
  private shells = new Map<string, FakeShell>();
  private nextId = 1;
  private dataListeners: ((id: string, data: string) => void)[] = [];
  private exitListeners: ((id: string) => void)[] = [];
  private lastRun: Promise<void> = Promise.resolve();

  async createPty(): Promise<string> {
    const first = this.nextId === 1;
    const id = `demo-${this.nextId++}`;
    const shell = new FakeShell(this, (data) => {
      for (const listener of this.dataListeners) listener(id, data);
    });
    this.shells.set(id, shell);
    // Output has to wait for TabManager to map the id to its pane, or it's
    // dropped - real shells are never that fast either. Only the first shell
    // prints the MOTD, to keep later tabs and panes uncluttered.
    setTimeout(() => shell.start(first), 150);
    return id;
  }

  closePty(id: string): void {
    this.shells.get(id)?.close();
    this.shells.delete(id);
    // Real ptys report their exit asynchronously; PaneGroup removes the pane then.
    setTimeout(() => {
      for (const listener of this.exitListeners) listener(id);
    }, 0);
  }

  input(id: string, data: string): void {
    const run = this.shells.get(id)?.input(data);
    if (run) this.lastRun = run;
  }

  resize(): void {}

  onData(callback: (id: string, data: string) => void): void {
    this.dataListeners.push(callback);
  }

  onExit(callback: (id: string) => void): void {
    this.exitListeners.push(callback);
  }

  /** Resolves once the most recently entered command has printed its output. */
  commandDone(): Promise<void> {
    return this.lastRun;
  }

  /** Simulates saving the fix in an editor: running watchers rebuild. */
  async saveFix(): Promise<void> {
    this.fixed = true;
    await Promise.all([...this.shells.values()].map((shell) => shell.onSave?.()));
  }
}

async function type(tabs: TabManager, demo: DemoPtys, command: string): Promise<void> {
  await sleep(rand(500, 1000));
  for (const ch of command) {
    tabs.sendInput(ch);
    await sleep(rand(35, 110));
  }
  await sleep(rand(200, 450));
  tabs.sendInput('\r');
  await demo.commandDone();
}

// The showcase, for screen recordings (npm run demo:record). Tabs, splits, and
// tab switches go through the same TabManager methods the shortcuts call.
export async function runDemo(tabs: TabManager, demo: DemoPtys): Promise<void> {
  // Let the MOTD and Ed's greeting land before typing starts.
  await sleep(3000);
  await type(tabs, demo, 'npm install');
  await sleep(6000);

  // A second tab: a watch build that hits a type error.
  await tabs.createTab();
  await sleep(1500);
  await type(tabs, demo, 'npm run build -- --watch');
  await sleep(6000);

  // Split it, save the fix, and watch the build recover beside the tests.
  await tabs.splitActive('row');
  await sleep(1500);
  await demo.saveFix();
  await sleep(2000);
  await type(tabs, demo, 'npm test');
  await sleep(7000);

  // Back to the first tab to ship it.
  tabs.cycleTab(-1);
  await sleep(1500);
  await type(tabs, demo, 'git commit -am "fix: believe in yourself"');
  await sleep(6500);
  await type(tabs, demo, 'git push');
  await sleep(6500);
  await type(tabs, demo, 'ed');
  await sleep(8000);
}
