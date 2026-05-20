import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import { OverlayWindowController } from './overlay.window.js';
import { IPC_CHANNELS } from '@main/ipc/ipc.channels.js';
import type { BlurRegion } from '@shared/types/profile.types.js';

interface MockWebContents {
  send: ReturnType<typeof vi.fn>;
}

interface MockWindow {
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  setIgnoreMouseEvents: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  webContents: MockWebContents;
}

describe('OverlayWindowController', () => {
  let mockWin: MockWindow;
  let controller: OverlayWindowController;

  beforeEach(() => {
    mockWin = {
      show: vi.fn(),
      hide: vi.fn(),
      setIgnoreMouseEvents: vi.fn(),
      destroy: vi.fn(),
      webContents: { send: vi.fn() },
    };
    controller = new OverlayWindowController(mockWin as unknown as BrowserWindow);
  });

  describe('show()', () => {
    it('calls win.show()', () => {
      controller.show();
      expect(mockWin.show).toHaveBeenCalledOnce();
    });
  });

  describe('hide()', () => {
    it('calls win.hide()', () => {
      controller.hide();
      expect(mockWin.hide).toHaveBeenCalledOnce();
    });
  });

  describe('updateRegions()', () => {
    it('sends regions via OVERLAY_UPDATE_REGIONS channel', () => {
      const regions: BlurRegion[] = [
        { id: '1', x: 10, y: 10, width: 20, height: 20, blurStrength: 10 },
      ];
      controller.updateRegions(regions);
      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.OVERLAY_UPDATE_REGIONS,
        regions,
      );
    });

    it('sends empty array when no regions provided', () => {
      controller.updateRegions([]);
      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.OVERLAY_UPDATE_REGIONS,
        [],
      );
    });

    it('sends multiple regions', () => {
      const regions: BlurRegion[] = [
        { id: '1', x: 0, y: 0, width: 50, height: 50, blurStrength: 8 },
        { id: '2', x: 50, y: 50, width: 25, height: 25, blurStrength: 12 },
      ];
      controller.updateRegions(regions);
      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.OVERLAY_UPDATE_REGIONS,
        regions,
      );
    });
  });

  describe('setSettingsMode()', () => {
    it('disables mouse pass-through when settings mode is active', () => {
      controller.setSettingsMode(true);
      expect(mockWin.setIgnoreMouseEvents).toHaveBeenCalledWith(false);
    });

    it('enables mouse pass-through when settings mode is inactive', () => {
      controller.setSettingsMode(false);
      expect(mockWin.setIgnoreMouseEvents).toHaveBeenCalledWith(true);
    });

    it('sends active=true via OVERLAY_SETTINGS_MODE channel', () => {
      controller.setSettingsMode(true);
      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.OVERLAY_SETTINGS_MODE,
        true,
      );
    });

    it('sends active=false via OVERLAY_SETTINGS_MODE channel', () => {
      controller.setSettingsMode(false);
      expect(mockWin.webContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.OVERLAY_SETTINGS_MODE,
        false,
      );
    });
  });

  describe('destroy()', () => {
    it('calls win.destroy()', () => {
      controller.destroy();
      expect(mockWin.destroy).toHaveBeenCalledOnce();
    });
  });
});
