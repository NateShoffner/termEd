import * as fs from 'fs';
import * as path from 'path';

// Resolves a command the way a shell would: as a path if it has a separator,
// otherwise by searching PATH (and PATHEXT on Windows).
function findExecutable(command: string): string | null {
  const isWindows = process.platform === 'win32';
  const extensions = isWindows
    ? ['', ...(process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';')]
    : [''];
  const bases = /[\\/]/.test(command)
    ? [command]
    : (process.env.PATH ?? '')
        .split(path.delimiter)
        .filter(Boolean)
        .map((dir) => path.join(dir, command));

  for (const base of bases) {
    for (const ext of extensions) {
      const file = base + ext;
      try {
        // lstat, not stat: Windows app execution aliases (how Store-installed
        // pwsh lands on PATH) are reparse points that stat can't follow.
        if (!fs.lstatSync(file).isDirectory()) return file;
      } catch {}
    }
  }
  return null;
}

export function resolveShell(preferred: string): string {
  if (process.env.TERMED_SHELL) return process.env.TERMED_SHELL;
  // A saved shell that's been uninstalled or mistyped falls back to
  // auto-detect, rather than leaving the user unable to open a tab at all.
  if (preferred && findExecutable(preferred)) return preferred;
  if (process.platform === 'win32') {
    return findExecutable('pwsh.exe') ? 'pwsh.exe' : 'powershell.exe';
  }
  return process.env.SHELL || '/bin/bash';
}

let detected: string[] | null = null;

// Suggestions for the settings panel's shell field. Cached: installed shells
// don't change while the app is open, and PATH searches aren't free.
export function detectShells(): string[] {
  if (detected) return detected;
  if (process.platform === 'win32') {
    const gitBash = path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe');
    detected = [
      ...['pwsh.exe', 'powershell.exe', 'cmd.exe', 'wsl.exe'].filter((cmd) => findExecutable(cmd)),
      ...(findExecutable(gitBash) ? [gitBash] : []),
    ];
  } else {
    let lines: string[] = [];
    try {
      lines = fs.readFileSync('/etc/shells', 'utf8').split('\n');
    } catch {}
    const shells = lines.map((line) => line.trim()).filter((line) => line.startsWith('/'));
    detected = [...new Set(shells)].filter((shell) => findExecutable(shell));
  }
  return detected;
}
