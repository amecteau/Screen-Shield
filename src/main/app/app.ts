import { app, BrowserWindow } from 'electron';

export interface AppManagerOptions {
  readonly onFocusSettings?: () => void;
  readonly onShowSettings?: () => void;
}

export function initializeApp(
  onReady: () => Promise<void>,
  options: AppManagerOptions = {},
): void {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    options.onFocusSettings?.();
  });

  // Tray app — stay alive when all windows are closed.
  app.on('window-all-closed', () => {
    // intentionally empty
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      options.onShowSettings?.();
    }
  });

  void app.whenReady().then(async () => {
    try {
      await onReady();
    } catch (error) {
      console.error('[AppManager] Fatal initialization error:', error);
      app.quit();
    }
  });
}
