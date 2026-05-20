import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './ipc.channels.js';
import {
  IdParamSchema,
  ProfileSaveRequestSchema,
  SetActiveProfileSchema,
} from '@main/profiles/profile.schema.js';
import type { ProfileService } from '@main/profiles/profile.service.js';
import type { OverlayWindowController } from '@main/windows/overlay.window.js';
import type { SettingsWindowController } from '@main/windows/settings.window.js';
import type { TrayService } from '@main/tray/tray.service.js';
import type { BlurProfile, IpcResult } from '@shared/types/profile.types.js';

function syncOverlayAndTray(
  profileService: ProfileService,
  overlayController: OverlayWindowController,
  trayService: TrayService,
): void {
  overlayController.updateRegions(profileService.getActiveRegions());
  trayService.refresh();
}

export function registerIpcHandlers(
  profileService: ProfileService,
  overlayController: OverlayWindowController,
  settingsController: SettingsWindowController,
  trayService: TrayService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.PROFILE_GET_ALL,
    (): IpcResult<readonly BlurProfile[]> => profileService.getAllProfiles(),
  );

  ipcMain.handle(
    IPC_CHANNELS.PROFILE_GET,
    (_event, payload: unknown): IpcResult<BlurProfile> => {
      const parsed = IdParamSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid request: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        };
      }
      return profileService.getProfile(parsed.data.id);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PROFILE_SAVE,
    (_event, payload: unknown): IpcResult<BlurProfile> => {
      const parsed = ProfileSaveRequestSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid profile: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        };
      }
      const result = profileService.saveProfile(parsed.data);
      if (result.success) {
        syncOverlayAndTray(profileService, overlayController, trayService);
      }
      return result;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PROFILE_DELETE,
    (_event, payload: unknown): IpcResult<void> => {
      const parsed = IdParamSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid request: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        };
      }
      const result = profileService.deleteProfile(parsed.data.id);
      if (result.success) {
        syncOverlayAndTray(profileService, overlayController, trayService);
      }
      return result;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PROFILE_SET_ACTIVE,
    (_event, payload: unknown): IpcResult<void> => {
      const parsed = SetActiveProfileSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid request: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        };
      }
      const result = profileService.setActiveProfile(parsed.data.id);
      if (result.success) {
        syncOverlayAndTray(profileService, overlayController, trayService);
      }
      return result;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.PROFILE_GET_ACTIVE_ID,
    (): IpcResult<string | null> => profileService.getActiveProfileId(),
  );

  ipcMain.handle(IPC_CHANNELS.SETTINGS_OPEN, (): IpcResult<void> => {
    settingsController.show();
    return { success: true, data: undefined };
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_CLOSE, (): IpcResult<void> => {
    settingsController.hide();
    return { success: true, data: undefined };
  });
}
