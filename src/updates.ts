// Update state, owned by the main process (src/updater.ts) and mirrored into
// the renderer (src/renderer/update-ui.ts). No Node or DOM imports: both
// bundles include this file.

export type UpdateStatus =
  | 'unsupported' // dev build: no update metadata to check against
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available' // newer version found, but this build can't install it itself
  | 'downloading'
  | 'ready' // downloaded, installs on restart
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  /** False on macOS (unsigned) and portable builds: they link to the release page instead. */
  canInstall: boolean;
  version?: string;
  /** Download progress, 0-100. */
  percent?: number;
  error?: string;
}
