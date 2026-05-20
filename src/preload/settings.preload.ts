import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@main/ipc/ipc.channels.js';
import type { SettingsApi } from '@shared/types/profile.types.js';

const api: SettingsApi = {
  getProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_ALL),
  getProfile: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET, { id }),
  saveProfile: (profile) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SAVE, profile),
  deleteProfile: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DELETE, { id }),
  setActiveProfile: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SET_ACTIVE, { id }),
  getActiveProfileId: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_ACTIVE_ID),
};

contextBridge.exposeInMainWorld('screenShield', api);
