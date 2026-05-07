/**
 * A rectangular screen region to be blurred during screen shares.
 * Coordinates are stored as percentages (0–100) of screen dimensions
 * for portability across resolutions.
 */
export interface BlurRegion {
  readonly id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  blurStrength: number;
}

/**
 * A named collection of blur regions that can be activated/deactivated
 * as a unit via the system tray menu.
 */
export interface BlurProfile {
  readonly id: string;
  name: string;
  regions: readonly BlurRegion[];
  readonly createdAt: string;
  updatedAt: string;
}

/**
 * Result type for IPC responses — never throw across the IPC boundary.
 */
export type IpcResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string };

/**
 * The API surface exposed to the settings renderer via contextBridge.
 */
export interface SettingsApi {
  getProfiles(): Promise<IpcResult<readonly BlurProfile[]>>;
  getProfile(id: string): Promise<IpcResult<BlurProfile>>;
  saveProfile(profile: BlurProfile): Promise<IpcResult<BlurProfile>>;
  deleteProfile(id: string): Promise<IpcResult<void>>;
  setActiveProfile(id: string | null): Promise<IpcResult<void>>;
  getActiveProfileId(): Promise<IpcResult<string | null>>;
}

/**
 * The API surface exposed to the overlay renderer via contextBridge.
 */
export interface OverlayApi {
  onRegionsUpdate(callback: (regions: readonly BlurRegion[]) => void): void;
  onSettingsModeChange(callback: (active: boolean) => void): void;
}
