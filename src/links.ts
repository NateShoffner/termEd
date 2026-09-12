// The only URLs the app ever opens externally. main.ts allowlists exactly
// these, and the About screen links to them.
export const CREDITS_URL = 'https://nateshoffner.com';
export const REPO_URL = 'https://github.com/NateShoffner/termEd';
export const COMMIT_URL = `${REPO_URL}/commit/${__COMMIT_HASH__}`;
