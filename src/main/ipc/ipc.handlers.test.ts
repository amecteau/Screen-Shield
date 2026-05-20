import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHandle } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}));

import { registerIpcHandlers } from './ipc.handlers.js';
import { IPC_CHANNELS } from './ipc.channels.js';
import type { ProfileService } from '@main/profiles/profile.service.js';
import type { OverlayWindowController } from '@main/windows/overlay.window.js';
import type { SettingsWindowController } from '@main/windows/settings.window.js';
import type { TrayService } from '@main/tray/tray.service.js';
import type { BlurProfile } from '@shared/types/profile.types.js';

const VALID_UUID = '12345678-1234-1234-1234-123456789012';
const VALID_UUID_2 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function makeProfile(overrides: Partial<BlurProfile> = {}): BlurProfile {
  return {
    id: VALID_UUID,
    name: 'Test Profile',
    regions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeMockProfileService(): ProfileService {
  return {
    getAllProfiles: vi.fn().mockReturnValue({ success: true, data: [] }),
    getProfile: vi.fn().mockReturnValue({ success: true, data: makeProfile() }),
    saveProfile: vi.fn().mockReturnValue({ success: true, data: makeProfile() }),
    deleteProfile: vi.fn().mockReturnValue({ success: true, data: undefined }),
    setActiveProfile: vi.fn().mockReturnValue({ success: true, data: undefined }),
    getActiveProfileId: vi.fn().mockReturnValue({ success: true, data: null }),
    getActiveRegions: vi.fn().mockReturnValue([]),
    createBlankProfile: vi.fn(),
  } as unknown as ProfileService;
}

function makeMockOverlayController(): OverlayWindowController {
  return {
    show: vi.fn(),
    hide: vi.fn(),
    updateRegions: vi.fn(),
    setSettingsMode: vi.fn(),
    destroy: vi.fn(),
  } as unknown as OverlayWindowController;
}

function makeMockSettingsController(): SettingsWindowController {
  return {
    show: vi.fn(),
    hide: vi.fn(),
    isVisible: vi.fn().mockReturnValue(false),
  } as unknown as SettingsWindowController;
}

function makeMockTrayService(): TrayService {
  return {
    refresh: vi.fn(),
  } as unknown as TrayService;
}

type HandlerFn = (event: null, payload?: unknown) => unknown;

function getHandler(channel: string): HandlerFn {
  const calls = mockHandle.mock.calls as Array<[string, HandlerFn]>;
  const call = calls.find(([ch]) => ch === channel);
  if (!call) throw new Error(`No handler registered for channel: "${channel}"`);
  return call[1];
}

describe('registerIpcHandlers', () => {
  let profileService: ProfileService;
  let overlayController: OverlayWindowController;
  let settingsController: SettingsWindowController;
  let trayService: TrayService;

  beforeEach(() => {
    vi.clearAllMocks();

    profileService = makeMockProfileService();
    overlayController = makeMockOverlayController();
    settingsController = makeMockSettingsController();
    trayService = makeMockTrayService();

    registerIpcHandlers(profileService, overlayController, settingsController, trayService);
  });

  describe('channel registration', () => {
    it.each([
      IPC_CHANNELS.PROFILE_GET_ALL,
      IPC_CHANNELS.PROFILE_GET,
      IPC_CHANNELS.PROFILE_SAVE,
      IPC_CHANNELS.PROFILE_DELETE,
      IPC_CHANNELS.PROFILE_SET_ACTIVE,
      IPC_CHANNELS.PROFILE_GET_ACTIVE_ID,
      IPC_CHANNELS.SETTINGS_OPEN,
      IPC_CHANNELS.SETTINGS_CLOSE,
    ])('registers handler for %s', (channel) => {
      expect(mockHandle).toHaveBeenCalledWith(channel, expect.any(Function));
    });

    it('registers exactly 8 handlers', () => {
      expect(mockHandle).toHaveBeenCalledTimes(8);
    });
  });

  describe('PROFILE_GET_ALL', () => {
    it('returns profiles from service', () => {
      const profiles = [makeProfile()];
      vi.mocked(profileService.getAllProfiles).mockReturnValue({ success: true, data: profiles });
      const handler = getHandler(IPC_CHANNELS.PROFILE_GET_ALL);
      expect(handler(null)).toEqual({ success: true, data: profiles });
    });

    it('passes through service error', () => {
      vi.mocked(profileService.getAllProfiles).mockReturnValue({
        success: false,
        error: 'store failed',
      });
      const handler = getHandler(IPC_CHANNELS.PROFILE_GET_ALL);
      expect(handler(null)).toEqual({ success: false, error: 'store failed' });
    });
  });

  describe('PROFILE_GET', () => {
    it('returns profile for valid uuid', () => {
      const profile = makeProfile();
      vi.mocked(profileService.getProfile).mockReturnValue({ success: true, data: profile });
      const handler = getHandler(IPC_CHANNELS.PROFILE_GET);
      expect(handler(null, { id: VALID_UUID })).toEqual({ success: true, data: profile });
      expect(vi.mocked(profileService.getProfile)).toHaveBeenCalledWith(VALID_UUID);
    });

    it('rejects invalid uuid', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_GET);
      const result = handler(null, { id: 'not-a-uuid' }) as { success: false; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid request/);
    });

    it('rejects missing id field', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_GET);
      const result = handler(null, {}) as { success: false; error: string };
      expect(result.success).toBe(false);
    });

    it('rejects non-object payload', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_GET);
      const result = handler(null, 'bad-payload') as { success: false; error: string };
      expect(result.success).toBe(false);
    });
  });

  describe('PROFILE_SAVE', () => {
    const validProfile = {
      id: VALID_UUID,
      name: 'Test',
      regions: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    it('saves and returns updated profile', () => {
      const saved = makeProfile({ name: 'Test' });
      vi.mocked(profileService.saveProfile).mockReturnValue({ success: true, data: saved });
      const handler = getHandler(IPC_CHANNELS.PROFILE_SAVE);
      expect(handler(null, validProfile)).toEqual({ success: true, data: saved });
    });

    it('calls profileService.saveProfile with validated data', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_SAVE);
      handler(null, validProfile);
      expect(vi.mocked(profileService.saveProfile)).toHaveBeenCalledOnce();
    });

    it('syncs overlay and tray after successful save', () => {
      const regions = [{ id: VALID_UUID_2, x: 0, y: 0, width: 50, height: 50, blurStrength: 20 }];
      vi.mocked(profileService.getActiveRegions).mockReturnValue(regions);
      const handler = getHandler(IPC_CHANNELS.PROFILE_SAVE);
      handler(null, validProfile);
      expect(vi.mocked(overlayController.updateRegions)).toHaveBeenCalledWith(regions);
      expect(vi.mocked(trayService.refresh)).toHaveBeenCalledOnce();
    });

    it('does not sync on failed save', () => {
      vi.mocked(profileService.saveProfile).mockReturnValue({
        success: false,
        error: 'disk full',
      });
      const handler = getHandler(IPC_CHANNELS.PROFILE_SAVE);
      handler(null, validProfile);
      expect(vi.mocked(overlayController.updateRegions)).not.toHaveBeenCalled();
      expect(vi.mocked(trayService.refresh)).not.toHaveBeenCalled();
    });

    it('rejects profile with invalid id', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_SAVE);
      const result = handler(null, {
        ...validProfile,
        id: 'not-a-uuid',
      }) as { success: false; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid profile/);
    });

    it('rejects profile with empty name', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_SAVE);
      const result = handler(null, { ...validProfile, name: '' }) as {
        success: false;
        error: string;
      };
      expect(result.success).toBe(false);
    });

    it('rejects non-object payload', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_SAVE);
      const result = handler(null, null) as { success: false; error: string };
      expect(result.success).toBe(false);
    });
  });

  describe('PROFILE_DELETE', () => {
    it('deletes profile for valid uuid', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_DELETE);
      const result = handler(null, { id: VALID_UUID });
      expect(vi.mocked(profileService.deleteProfile)).toHaveBeenCalledWith(VALID_UUID);
      expect(result).toEqual({ success: true, data: undefined });
    });

    it('syncs overlay and tray after successful delete', () => {
      const regions = [{ id: VALID_UUID_2, x: 0, y: 0, width: 50, height: 50, blurStrength: 20 }];
      vi.mocked(profileService.getActiveRegions).mockReturnValue(regions);
      const handler = getHandler(IPC_CHANNELS.PROFILE_DELETE);
      handler(null, { id: VALID_UUID });
      expect(vi.mocked(overlayController.updateRegions)).toHaveBeenCalledWith(regions);
      expect(vi.mocked(trayService.refresh)).toHaveBeenCalledOnce();
    });

    it('does not sync on failed delete', () => {
      vi.mocked(profileService.deleteProfile).mockReturnValue({
        success: false,
        error: 'not found',
      });
      const handler = getHandler(IPC_CHANNELS.PROFILE_DELETE);
      handler(null, { id: VALID_UUID });
      expect(vi.mocked(overlayController.updateRegions)).not.toHaveBeenCalled();
      expect(vi.mocked(trayService.refresh)).not.toHaveBeenCalled();
    });

    it('rejects invalid uuid', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_DELETE);
      const result = handler(null, { id: 'bad' }) as { success: false; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid request/);
    });
  });

  describe('PROFILE_SET_ACTIVE', () => {
    it('sets active profile for valid uuid', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_SET_ACTIVE);
      handler(null, { id: VALID_UUID });
      expect(vi.mocked(profileService.setActiveProfile)).toHaveBeenCalledWith(VALID_UUID);
    });

    it('accepts null id to deactivate', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_SET_ACTIVE);
      handler(null, { id: null });
      expect(vi.mocked(profileService.setActiveProfile)).toHaveBeenCalledWith(null);
    });

    it('syncs overlay and tray after successful set', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_SET_ACTIVE);
      handler(null, { id: VALID_UUID });
      expect(vi.mocked(overlayController.updateRegions)).toHaveBeenCalledOnce();
      expect(vi.mocked(trayService.refresh)).toHaveBeenCalledOnce();
    });

    it('does not sync on failed set', () => {
      vi.mocked(profileService.setActiveProfile).mockReturnValue({
        success: false,
        error: 'not found',
      });
      const handler = getHandler(IPC_CHANNELS.PROFILE_SET_ACTIVE);
      handler(null, { id: VALID_UUID });
      expect(vi.mocked(overlayController.updateRegions)).not.toHaveBeenCalled();
      expect(vi.mocked(trayService.refresh)).not.toHaveBeenCalled();
    });

    it('rejects invalid uuid', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_SET_ACTIVE);
      const result = handler(null, { id: 'bad' }) as { success: false; error: string };
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid request/);
    });

    it('rejects missing id field', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_SET_ACTIVE);
      const result = handler(null, {}) as { success: false; error: string };
      expect(result.success).toBe(false);
    });
  });

  describe('PROFILE_GET_ACTIVE_ID', () => {
    it('returns active profile id', () => {
      vi.mocked(profileService.getActiveProfileId).mockReturnValue({
        success: true,
        data: VALID_UUID,
      });
      const handler = getHandler(IPC_CHANNELS.PROFILE_GET_ACTIVE_ID);
      expect(handler(null)).toEqual({ success: true, data: VALID_UUID });
    });

    it('returns null when no active profile', () => {
      const handler = getHandler(IPC_CHANNELS.PROFILE_GET_ACTIVE_ID);
      expect(handler(null)).toEqual({ success: true, data: null });
    });
  });

  describe('SETTINGS_OPEN', () => {
    it('calls settingsController.show()', () => {
      const handler = getHandler(IPC_CHANNELS.SETTINGS_OPEN);
      handler(null);
      expect(vi.mocked(settingsController.show)).toHaveBeenCalledOnce();
    });

    it('returns success result', () => {
      const handler = getHandler(IPC_CHANNELS.SETTINGS_OPEN);
      expect(handler(null)).toEqual({ success: true, data: undefined });
    });
  });

  describe('SETTINGS_CLOSE', () => {
    it('calls settingsController.hide()', () => {
      const handler = getHandler(IPC_CHANNELS.SETTINGS_CLOSE);
      handler(null);
      expect(vi.mocked(settingsController.hide)).toHaveBeenCalledOnce();
    });

    it('returns success result', () => {
      const handler = getHandler(IPC_CHANNELS.SETTINGS_CLOSE);
      expect(handler(null)).toEqual({ success: true, data: undefined });
    });
  });
});
