import type { Terminal } from '@xterm/xterm';
import { getMotd } from '../motd';
import type { EdEngine } from './ed-engine';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

const PROMPT = '\x1b[1;32m➜\x1b[0m \x1b[36mapp\x1b[0m \x1b[90mgit:(main)\x1b[0m ';
const RED = (s: string) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[90m${s}\x1b[0m`;

const MOTD_COLORS: Record<string, string> = {
  Cyan: '\x1b[1;36m',
  DarkGray: '\x1b[90m',
  Yellow: '\x1b[33m',
};

interface DemoStep {
  cmd: string;
  output: string[];
  pauseAfter: number;
}

const STEPS: DemoStep[] = [
  {
    cmd: 'npm install',
    output: [
      '',
      'added 142 packages, and audited 143 packages in 3s',
      '',
      '23 packages are looking for funding',
      '',
      'found 0 vulnerabilities',
    ],
    pauseAfter: 7000,
  },
  {
    cmd: 'npm test',
    output: [
      '',
      DIM('> app@1.0.0 test'),
      DIM('> vitest run'),
      '',
      ` ${GREEN('✓')} src/motd.test.ts (4 tests) 12ms`,
      ` ${GREEN('✓')} src/engine.test.ts (9 tests) 31ms`,
      '',
      ` Test Files  ${GREEN('2 passed')} (2)`,
      `      Tests  ${GREEN('13 passed')} (13)`,
    ],
    pauseAfter: 7500,
  },
  {
    cmd: 'npm run build',
    output: [
      '',
      DIM('> app@1.0.0 build'),
      DIM('> tsc -p .'),
      '',
      RED("src/engine.ts:42:18 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'."),
      '',
      '42   applyHype(level);',
      RED('                ~~~~~'),
      '',
      RED('Found 1 error in src/engine.ts:42'),
    ],
    pauseAfter: 8500,
  },
  {
    cmd: 'npm run build',
    output: ['', DIM('> app@1.0.0 build'), DIM('> tsc -p .'), ''],
    pauseAfter: 7000,
  },
  {
    cmd: 'git commit -am "fix: believe in yourself"',
    output: [
      '[main 3f81d2c] fix: believe in yourself',
      ' 1 file changed, 1 insertion(+), 1 deletion(-)',
    ],
    pauseAfter: 7500,
  },
  {
    cmd: 'git push',
    output: [
      'Enumerating objects: 7, done.',
      'Counting objects: 100% (7/7), done.',
      'Writing objects: 100% (4/4), 412 bytes | 412.00 KiB/s, done.',
      'To github.com:you/app.git',
      '   8d21f3a..3f81d2c  main -> main',
    ],
    pauseAfter: 8000,
  },
  {
    cmd: 'ed',
    output: [],
    pauseAfter: 8000,
  },
];

// Scripted showcase for screen recordings: fake prompt, fake output, real Ed.
// Commands never execute; keystrokes and output are fed through the same
// EdEngine hooks the live terminal uses, so every reaction is genuine.
export async function runDemo(term: Terminal, ed: EdEngine): Promise<void> {
  for (const line of getMotd(window.termed.version)) {
    term.writeln(`  ${MOTD_COLORS[line.color] ?? ''}${line.text}\x1b[0m`);
  }
  term.writeln('');
  await sleep(3000);

  for (const step of STEPS) {
    term.write(PROMPT);
    await sleep(rand(500, 1000));
    for (const ch of step.cmd) {
      term.write(ch);
      ed.onKeystroke(ch);
      await sleep(rand(35, 110));
    }
    await sleep(rand(200, 450));
    term.write('\r\n');
    ed.onKeystroke('\r');
    await sleep(rand(300, 700));
    for (const line of step.output) {
      term.writeln(line);
      await sleep(rand(20, 70));
    }
    ed.onOutput(step.output.join('\n'));
    await sleep(step.pauseAfter);
  }

  term.write(PROMPT);
}
