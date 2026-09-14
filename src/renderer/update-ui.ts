import { RELEASES_URL } from '../links';
import type { UpdateState } from '../updates';

interface UpdateView {
  text: string;
  /** About screen button label; none while there's nothing to do. */
  action?: string;
  /** Tab bar menu entry label, only while an update is waiting. */
  menu?: string;
}

function describe(state: UpdateState): UpdateView {
  const version = state.version ? `v${state.version}` : 'An update';
  switch (state.status) {
    case 'unsupported':
      return { text: 'Update checks only run in installed builds.' };
    case 'idle':
      return { text: '', action: 'Check for updates' };
    case 'checking':
      return { text: 'Checking for updates...' };
    case 'up-to-date':
      return { text: "You're on the latest version.", action: 'Check again' };
    case 'available':
      return { text: `${version} is available.`, action: 'Download', menu: 'Download update' };
    case 'downloading':
      return { text: `Downloading ${version}... ${state.percent ?? 0}%` };
    case 'ready':
      return {
        text: `${version} is ready to install.`,
        action: 'Restart to update',
        menu: 'Restart to update',
      };
    case 'error':
      return { text: "Couldn't check for updates.", action: 'Try again' };
  }
}

// Shows the main process's update state in the About screen and the tab bar
// menu. Main owns the state and does the checking; this only renders it and
// forwards clicks. Returns the action for the menu entry to run.
export function initUpdateUi(): () => void {
  const status = document.getElementById('ed-about-update-status')!;
  const button = document.getElementById('ed-about-update-action') as HTMLButtonElement;
  const menuItem = document.querySelector<HTMLButtonElement>('#ed-menu [data-action="update"]')!;
  const menuButton = document.getElementById('ed-tab-menu')!;
  let state: UpdateState = { status: 'unsupported', canInstall: false };

  const render = (next: UpdateState) => {
    state = next;
    const view = describe(next);
    status.textContent = view.text;
    status.title = next.error ?? '';
    button.hidden = !view.action;
    button.textContent = view.action ?? '';
    menuItem.hidden = !view.menu;
    menuItem.textContent = view.menu ?? '';
    menuButton.classList.toggle('has-update', Boolean(view.menu));
  };

  const run = () => {
    if (state.status === 'ready') window.termed.installUpdate();
    else if (state.status === 'available') window.termed.openExternal(RELEASES_URL);
    else window.termed.checkForUpdates();
  };
  button.addEventListener('click', run);

  // A push can land before the initial fetch resolves, and is always newer.
  let pushed = false;
  window.termed.onUpdateState((next) => {
    pushed = true;
    render(next);
  });
  void window.termed.getUpdateState().then((initial) => {
    if (!pushed) render(initial);
  });
  render(state);
  return run;
}
