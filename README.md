# termEd

**The terminal that believes in you.**

A terminal emulator built around Ed - hype man, IBM RPG programmer, comics enthusiast.

![termEd demo](assets/demo.gif)

## Features

- A real terminal - wraps your actual shell via a pseudo-terminal
- Ed watches from the background and strikes a new pose when he speaks
- Dynamic MOTD on every launch
- Command reactions: pushes get celebrated, errors get encouragement
- Ambient RPG facts, comics references, and new comic book day tracking
- Idle check-ins

## Usage

```
npm install
npm start
```

Set `TERMED_SHELL` to use a specific shell. `npm run demo` plays a scripted session with no real shell.

## Development

Electron + [xterm.js](https://xtermjs.org/) + [@lydell/node-pty](https://github.com/lydell/node-pty), written in TypeScript and bundled with esbuild. `npm run check` typechecks, `npm run build` bundles to `out/`.
