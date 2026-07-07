# termEd

**The terminal that believes in you.**

A fully functional terminal emulator built entirely around Ed - your personal hype man and the ultimate pair programmer.

![termEd demo](assets/demo.gif)

## Features

- **A real terminal.** Wraps your actual shell (PowerShell/pwsh on Windows, `$SHELL` elsewhere) via a pseudo-terminal.
- **Ed is always there.** His portrait sits behind your session, and he strikes a new pose when he speaks.
- **Dynamic MOTD** - every session opens with a fresh bit of Ed wisdom.
- **Command reactions** - wins get celebrated, errors get encouragement.
- **Ambient hype** - unprompted words of motivation every few minutes.
- **Idle check-ins** - gone quiet? Ed checks on you.

Ed speaks through an overlay bubble, never into the shell stream.

## Installation

Grab an installer from [Releases](https://github.com/NateShoffner/termEd/releases), or run from source:

```
npm install
npm start
```

Set `TERMED_SHELL` to use a specific shell. `npm run demo` plays a scripted session with no real shell.

## Development

Electron + [xterm.js](https://xtermjs.org/) + [@lydell/node-pty](https://github.com/lydell/node-pty), written in TypeScript and bundled with esbuild. `npm run check` typechecks, `npm run build` bundles to `out/`.
