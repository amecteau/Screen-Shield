import { BrowserWindow, session } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SECURITY_PREFS = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
} as const;

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'";

export function setupContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP],
      },
    });
  });
}

export function createOverlayWindow(preloadPath: string): BrowserWindow {
  const win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      ...SECURITY_PREFS,
      preload: preloadPath,
    },
  });

  win.setIgnoreMouseEvents(true);
  void win.loadFile(join(__dirname, '..', '..', 'renderer', 'overlay', 'index.html'));

  return win;
}

export function createSettingsWindow(preloadPath: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    center: true,
    show: false,
    webPreferences: {
      ...SECURITY_PREFS,
      preload: preloadPath,
    },
  });

  win.on('close', (event) => {
    event.preventDefault();
    win.hide();
  });

  void win.loadFile(join(__dirname, '..', '..', 'renderer', 'settings', 'index.html'));

  return win;
}
