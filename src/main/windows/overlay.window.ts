import type { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@main/ipc/ipc.channels.js';
import type { BlurRegion } from '@shared/types/profile.types.js';

export class OverlayWindowController {
  constructor(private readonly win: BrowserWindow) {}

  show(): void {
    this.win.show();
  }

  hide(): void {
    this.win.hide();
  }

  updateRegions(regions: readonly BlurRegion[]): void {
    this.win.webContents.send(IPC_CHANNELS.OVERLAY_UPDATE_REGIONS, regions);
  }

  setSettingsMode(active: boolean): void {
    this.win.setIgnoreMouseEvents(!active);
    this.win.webContents.send(IPC_CHANNELS.OVERLAY_SETTINGS_MODE, active);
  }

  destroy(): void {
    this.win.destroy();
  }
}
