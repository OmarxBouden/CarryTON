export function getTelegramUser() {
  if (typeof window === 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebApp = require('@twa-dev/sdk').default;
    return WebApp.initDataUnsafe?.user || null;
  } catch { return null; }
}

export function initTelegramApp() {
  if (typeof window === 'undefined') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebApp = require('@twa-dev/sdk').default;
    WebApp.ready();
    WebApp.expand();
    WebApp.enableClosingConfirmation();
  } catch {}
}

export function getTelegramTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebApp = require('@twa-dev/sdk').default;
    return WebApp.colorScheme || 'light';
  } catch { return 'light'; }
}
