import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Cosmetic dev-only fix: the locally installed Electron.app's Info.plist
// literally names it "Electron", which is what macOS shows in the Dock and
// menu bar for `npm start` regardless of app.setName() at runtime - that
// only affects what the app itself can report, not the launched bundle's
// identity. Packaged builds (electron-builder) already get correct branding
// independent of this; this just relabels the vendored dev binary to match.
// Re-run via postinstall since node_modules is re-fetched on every install.
if (process.platform !== 'darwin') process.exit(0);

const plist = 'node_modules/electron/dist/Electron.app/Contents/Info.plist';
if (!existsSync(plist)) process.exit(0);

for (const key of ['CFBundleName', 'CFBundleDisplayName']) {
  execFileSync('plutil', ['-replace', key, '-string', 'termEd', plist]);
}
