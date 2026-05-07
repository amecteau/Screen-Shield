/**
 * IPC channel name constants.
 *
 * Every IPC channel used in the application MUST be defined here.
 * Using magic strings for channel names is a security and maintainability risk.
 */
export const IPC_CHANNELS = {
  // Profile CRUD
  PROFILE_GET_ALL: 'profile:get-all',
  PROFILE_GET: 'profile:get',
  PROFILE_SAVE: 'profile:save',
  PROFILE_DELETE: 'profile:delete',

  // Active profile management
  PROFILE_SET_ACTIVE: 'profile:set-active',
  PROFILE_GET_ACTIVE_ID: 'profile:get-active-id',

  // Overlay control
  OVERLAY_UPDATE_REGIONS: 'overlay:update-regions',
  OVERLAY_SETTINGS_MODE: 'overlay:settings-mode',

  // Settings window
  SETTINGS_OPEN: 'settings:open',
  SETTINGS_CLOSE: 'settings:close',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
