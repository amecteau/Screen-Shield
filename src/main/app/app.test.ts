import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  app: {
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    quit: vi.fn(),
    on: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined),
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
}));

import { app, BrowserWindow } from 'electron';
import { initializeApp } from './app.js';

function getEventHandler(event: string): (() => void) | undefined {
  const call = vi.mocked(app.on).mock.calls.find(([e]) => e === event);
  return call?.[1] as (() => void) | undefined;
}

describe('initializeApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(app.requestSingleInstanceLock).mockReturnValue(true);
    vi.mocked(app.whenReady).mockResolvedValue(undefined as never);
    vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([]);
  });

  describe('single instance lock', () => {
    it('calls app.quit() when lock cannot be acquired', () => {
      vi.mocked(app.requestSingleInstanceLock).mockReturnValue(false);
      initializeApp(vi.fn());
      expect(app.quit).toHaveBeenCalledOnce();
    });

    it('does not call app.quit() when lock is acquired', () => {
      initializeApp(vi.fn());
      expect(app.quit).not.toHaveBeenCalled();
    });

    it('does not register event listeners when lock fails', () => {
      vi.mocked(app.requestSingleInstanceLock).mockReturnValue(false);
      initializeApp(vi.fn());
      expect(app.on).not.toHaveBeenCalled();
    });
  });

  describe('onReady callback', () => {
    it('invokes onReady after app.whenReady() resolves', async () => {
      const onReady = vi.fn().mockResolvedValue(undefined);
      initializeApp(onReady);
      await vi.waitFor(() => expect(onReady).toHaveBeenCalledOnce());
    });

    it('calls app.quit() if onReady throws', async () => {
      const onReady = vi.fn().mockRejectedValue(new Error('boot failure'));
      initializeApp(onReady);
      await vi.waitFor(() => expect(app.quit).toHaveBeenCalledOnce());
    });
  });

  describe('window-all-closed', () => {
    it('does not quit when all windows are closed', () => {
      initializeApp(vi.fn());
      const handler = getEventHandler('window-all-closed');
      expect(handler).toBeDefined();
      handler?.();
      expect(app.quit).not.toHaveBeenCalled();
    });
  });

  describe('second-instance', () => {
    it('calls onFocusSettings when a second instance is launched', () => {
      const onFocusSettings = vi.fn();
      initializeApp(vi.fn(), { onFocusSettings });
      const handler = getEventHandler('second-instance');
      handler?.();
      expect(onFocusSettings).toHaveBeenCalledOnce();
    });

    it('does not throw when onFocusSettings is not provided', () => {
      initializeApp(vi.fn());
      const handler = getEventHandler('second-instance');
      expect(() => handler?.()).not.toThrow();
    });
  });

  describe('activate (macOS)', () => {
    it('calls onShowSettings when no windows are open', () => {
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([]);
      const onShowSettings = vi.fn();
      initializeApp(vi.fn(), { onShowSettings });
      const handler = getEventHandler('activate');
      handler?.();
      expect(onShowSettings).toHaveBeenCalledOnce();
    });

    it('does not call onShowSettings when windows are already open', () => {
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([{} as BrowserWindow]);
      const onShowSettings = vi.fn();
      initializeApp(vi.fn(), { onShowSettings });
      const handler = getEventHandler('activate');
      handler?.();
      expect(onShowSettings).not.toHaveBeenCalled();
    });

    it('does not throw when onShowSettings is not provided', () => {
      initializeApp(vi.fn());
      const handler = getEventHandler('activate');
      expect(() => handler?.()).not.toThrow();
    });
  });
});
