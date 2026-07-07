# termEd

**The terminal that believes in you.**

A fully functional terminal emulator built entirely around Ed - the most uplifting friend a developer could have, and an avid IBM RPG programmer who will absolutely find a way to bring that up.

It started with a screenshot: a terminal with just enough transparency to reveal Ed's face watching over the session. Someone said "what if the whole terminal was just... Ed." So now it is.

## What it does

- **It's a real terminal.** termEd wraps your actual shell (PowerShell/pwsh on Windows, `$SHELL` elsewhere) via a pseudo-terminal. Run anything you'd normally run.
- **Ed is always there.** His portrait sits behind your session at a respectful opacity. When he speaks, he leans in.
- **Ed hypes you up:**
  - **Dynamic MOTD** - every session opens with a random Ed proverb, plus day-specific lines (Friday deploys, Monday resets, NCBD)
  - **Startup greeting** - a warm welcome the moment you open a session
  - **Command reactions** - pushes get celebrated, errors get encouragement ("RPG IV didn't compile first try either"), `rm` gets supportive caution
  - **Ambient wisdom** - every few minutes, an unsolicited motivational line, IBM RPG fact, or comics reference
  - **New comic book day** - Ed tracks NCBD (Wednesday) all week: countdown, "it's TOMORROW", full hype on the day, and "did you get your pulls?" on Thursday
  - **Idle check-ins** - gone quiet for a few minutes? Ed checks on you. No timeout on this session, ever.

Ed speaks through an overlay bubble, never into the shell stream - your actual terminal output is never touched.

## Running it

```
npm install
npm start
```

Requires Node.js. No build tools needed - the pty ships prebuilt binaries.

To use a specific shell: set `TERMED_SHELL` (e.g. `TERMED_SHELL=cmd.exe npm start`).

## Ed's portraits

The photos live in `assets/` as `ed-1.png` through `ed-10.png` (~1600px). A random one is picked each session for the backdrop and bubble avatar, and Ed strikes a new pose every time he speaks. To add a photo, drop a ~1600px PNG in `assets/` following the naming and bump the count in `ED_PHOTOS` in [src/renderer/renderer.js](src/renderer/renderer.js).

Opacity is tuned in `#ed-backdrop` (resting) and `body.ed-speaking #ed-backdrop` (leaning in) in [src/renderer/styles.css](src/renderer/styles.css).

## Tuning Ed

All of Ed's timing lives in `EdEngine`'s constructor options ([src/renderer/ed-engine.js](src/renderer/ed-engine.js)): global cooldown (~45s - he's a hype man, not a pop-up ad), idle threshold, ambient remark interval, and post-command hype probability. His entire vocabulary lives in [src/renderer/ed-quotes.js](src/renderer/ed-quotes.js) - PRs adding RPG references welcome.

## v2 roadmap

- Real exit-code detection via OSC 133 shell integration (today it's heuristic output-scanning)
- `ed` command that summons full-screen Ed
- Sound effects (a supportive "heyyy" on git push)
- `SIGNOFF` easter egg

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
