import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExposeInMainWorld, mockInvoke, mockOn } = vi.hoisted(() => ({
  mockExposeInMainWorld: vi.fn(),
  mockInvoke: vi.fn(),
  mockOn: vi.fn(),
}));

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: mockExposeInMainWorld },
  ipcRenderer: { invoke: mockInvoke, on: mockOn },
}));

// Side-effect imports — execute immediately using the mocked electron above
import './settings.preload.js';
import './overlay.preload.js';

import { IPC_CHANNELS } from '@main/ipc/ipc.channels.js';
import type { SettingsApi, OverlayApi, BlurProfile } from '@shared/types/profile.types.js';

const VALID_UUID = '12345678-1234-1234-1234-123456789012';

function makeProfile(): BlurProfile {
  return {
    id: VALID_UUID,
    name: 'Test Profile',
    regions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

// Find the API object exposed for a given preload by checking for a known method name
function getSettingsApi(): SettingsApi {
  for (const [key, exposed] of mockExposeInMainWorld.mock.calls as [string, unknown][]) {
    if (key === 'screenShield' && typeof (exposed as Record<string, unknown>).getProfiles === 'function') {
      return exposed as unknown as SettingsApi;
    }
  }
  throw new Error('Settings preload API not found — was settings.preload.ts imported?');
}

function getOverlayApi(): OverlayApi {
  for (const [key, exposed] of mockExposeInMainWorld.mock.calls as [string, unknown][]) {
    if (
      key === 'screenShield' &&
      typeof (exposed as Record<string, unknown>).onRegionsUpdate === 'function'
    ) {
      return exposed as unknown as OverlayApi;
    }
  }
  throw new Error('Overlay preload API not found — was overlay.preload.ts imported?');
}

describe('settings.preload', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue(undefined);
  });

  it('exposes API on the "screenShield" key', () => {
    const calls = mockExposeInMainWorld.mock.calls as [string, unknown][];
    const call = calls.find(
      ([key, api]) =>
        key === 'screenShield' &&
        typeof (api as Record<string, unknown>).getProfiles === 'function',
    );
    expect(call).toBeDefined();
    expect(call![0]).toBe('screenShield');
  });

  it('getProfiles invokes PROFILE_GET_ALL', async () => {
    await getSettingsApi().getProfiles();
    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.PROFILE_GET_ALL);
  });

  it('getProfile invokes PROFILE_GET with {id}', async () => {
    await getSettingsApi().getProfile('some-id');
    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.PROFILE_GET, { id: 'some-id' });
  });

  it('saveProfile invokes PROFILE_SAVE with the full profile object', async () => {
    const profile = makeProfile();
    await getSettingsApi().saveProfile(profile);
    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.PROFILE_SAVE, profile);
  });

  it('deleteProfile invokes PROFILE_DELETE with {id}', async () => {
    await getSettingsApi().deleteProfile('del-id');
    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.PROFILE_DELETE, { id: 'del-id' });
  });

  it('setActiveProfile invokes PROFILE_SET_ACTIVE with {id}', async () => {
    await getSettingsApi().setActiveProfile(VALID_UUID);
    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.PROFILE_SET_ACTIVE, { id: VALID_UUID });
  });

  it('setActiveProfile invokes PROFILE_SET_ACTIVE with {id: null} when null passed', async () => {
    await getSettingsApi().setActiveProfile(null);
    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.PROFILE_SET_ACTIVE, { id: null });
  });

  it('getActiveProfileId invokes PROFILE_GET_ACTIVE_ID', async () => {
    await getSettingsApi().getActiveProfileId();
    expect(mockInvoke).toHaveBeenCalledWith(IPC_CHANNELS.PROFILE_GET_ACTIVE_ID);
  });

  it('does not expose raw ipcRenderer', () => {
    const api = getSettingsApi() as unknown as Record<string, unknown>;
    expect('invoke' in api).toBe(false);
    expect('on' in api).toBe(false);
    expect('send' in api).toBe(false);
    expect('removeAllListeners' in api).toBe(false);
  });
});

describe('overlay.preload', () => {
  beforeEach(() => {
    mockOn.mockClear();
  });

  it('exposes API on the "screenShield" key', () => {
    const calls = mockExposeInMainWorld.mock.calls as [string, unknown][];
    const call = calls.find(
      ([key, api]) =>
        key === 'screenShield' &&
        typeof (api as Record<string, unknown>).onRegionsUpdate === 'function',
    );
    expect(call).toBeDefined();
    expect(call![0]).toBe('screenShield');
  });

  it('onRegionsUpdate registers listener on OVERLAY_UPDATE_REGIONS', () => {
    getOverlayApi().onRegionsUpdate(vi.fn());
    expect(mockOn).toHaveBeenCalledWith(IPC_CHANNELS.OVERLAY_UPDATE_REGIONS, expect.any(Function));
  });

  it('onRegionsUpdate listener forwards regions to callback', () => {
    const callback = vi.fn();
    getOverlayApi().onRegionsUpdate(callback);
    const calls = mockOn.mock.calls as [string, (e: null, r: unknown) => void][];
    const listener = calls.find(([ch]) => ch === IPC_CHANNELS.OVERLAY_UPDATE_REGIONS)![1];
    const regions = [{ id: VALID_UUID, x: 10, y: 10, width: 30, height: 30, blurStrength: 20 }];
    listener(null, regions);
    expect(callback).toHaveBeenCalledWith(regions);
  });

  it('onSettingsModeChange registers listener on OVERLAY_SETTINGS_MODE', () => {
    getOverlayApi().onSettingsModeChange(vi.fn());
    expect(mockOn).toHaveBeenCalledWith(IPC_CHANNELS.OVERLAY_SETTINGS_MODE, expect.any(Function));
  });

  it('onSettingsModeChange listener forwards active flag to callback', () => {
    const callback = vi.fn();
    getOverlayApi().onSettingsModeChange(callback);
    const calls = mockOn.mock.calls as [string, (e: null, a: unknown) => void][];
    const listener = calls.find(([ch]) => ch === IPC_CHANNELS.OVERLAY_SETTINGS_MODE)![1];
    listener(null, true);
    expect(callback).toHaveBeenCalledWith(true);
  });

  it('onSettingsModeChange listener forwards false correctly', () => {
    const callback = vi.fn();
    getOverlayApi().onSettingsModeChange(callback);
    const calls = mockOn.mock.calls as [string, (e: null, a: unknown) => void][];
    const listener = calls.find(([ch]) => ch === IPC_CHANNELS.OVERLAY_SETTINGS_MODE)![1];
    listener(null, false);
    expect(callback).toHaveBeenCalledWith(false);
  });

  it('does not expose raw ipcRenderer', () => {
    const api = getOverlayApi() as unknown as Record<string, unknown>;
    expect('invoke' in api).toBe(false);
    expect('on' in api).toBe(false);
    expect('send' in api).toBe(false);
    expect('removeAllListeners' in api).toBe(false);
  });
});
