import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@main/ipc/ipc.channels.js';
import type { OverlayApi } from '@shared/types/profile.types.js';

const api: OverlayApi = {
  onRegionsUpdate: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.OVERLAY_UPDATE_REGIONS, (_event, regions) => {
      callback(regions);
    });
  },
  onSettingsModeChange: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.OVERLAY_SETTINGS_MODE, (_event, active) => {
      callback(active);
    });
  },
};

contextBridge.exposeInMainWorld('screenShield', api);
