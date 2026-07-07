# termEd

**The terminal that believes in you.**

A fully functional terminal emulator built entirely around Ed - the most uplifting friend a developer could have, and an avid IBM RPG programmer who will absolutely find a way to bring that up.

## Features

- **A real terminal.** Wraps your actual shell (PowerShell/pwsh on Windows, `$SHELL` elsewhere) via a pseudo-terminal.
- **Ed is always there.** His portrait sits behind your session, and he strikes a new pose when he speaks.
- **Dynamic MOTD** - every session opens with a random Ed proverb, plus day-specific lines.
- **Command reactions** - pushes get celebrated, errors get encouragement, `rm -rf` gets supportive caution.
- **Ambient wisdom** - motivational lines, IBM RPG facts, and comics references every few minutes.
- **New comic book day** - tracked all week, celebrated on Wednesday.
- **Idle check-ins** - gone quiet? Ed checks on you.

Ed speaks through an overlay bubble, never into the shell stream.

## Running it

```
npm install
npm start
```

To use a specific shell: set `TERMED_SHELL` (e.g. `TERMED_SHELL=cmd.exe npm start`).

## Architecture

Electron + [xterm.js](https://xtermjs.org/) + [@lydell/node-pty](https://github.com/lydell/node-pty), written in TypeScript and bundled with esbuild ([scripts/build.mjs](scripts/build.mjs) emits to `out/`). Main process owns the pty; the renderer owns xterm and Ed.

```
src/main.ts                pty spawn + window + IPC
src/preload.ts             contextBridge (input/output/resize)
src/renderer/renderer.ts   xterm setup + wiring
src/renderer/ed-engine.ts  when Ed speaks
src/renderer/ed-quotes.ts  what Ed says
```

`npm run check` typechecks, `npm run build` bundles, `npm start` does both and launches.
