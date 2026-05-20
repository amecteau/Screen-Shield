// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { BlurProfile, IpcResult, SettingsApi } from '@shared/types/profile.types.js';

const VALID_UUID = '12345678-1234-1234-1234-123456789012';

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

function makeApi(overrides: Partial<SettingsApi> = {}): SettingsApi {
  return {
    getProfiles: vi.fn().mockResolvedValue({ success: true, data: [] } satisfies IpcResult<readonly BlurProfile[]>),
    getProfile: vi.fn().mockResolvedValue({ success: false, error: 'not found' }),
    saveProfile: vi.fn().mockResolvedValue({ success: true, data: makeProfile() }),
    deleteProfile: vi.fn().mockResolvedValue({ success: true, data: undefined }),
    setActiveProfile: vi.fn().mockResolvedValue({ success: true, data: undefined }),
    getActiveProfileId: vi.fn().mockResolvedValue({ success: true, data: null }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal('screenShield', makeApi());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Lazy import to pick up the fresh global stub on each test
async function importHook() {
  const { useProfiles } = await import('./use-profiles.js');
  return useProfiles;
}

describe('useProfiles', () => {
  it('starts in loading state', async () => {
    const useProfiles = await importHook();
    const { result } = renderHook(() => useProfiles());
    expect(result.current.loading).toBe(true);
  });

  it('loads profiles on mount', async () => {
    const profile = makeProfile();
    vi.mocked((window.screenShield as SettingsApi).getProfiles).mockResolvedValue({
      success: true,
      data: [profile],
    });
    const useProfiles = await importHook();
    const { result } = renderHook(() => useProfiles());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profiles).toEqual([profile]);
  });

  it('loads active profile id on mount', async () => {
    vi.mocked((window.screenShield as SettingsApi).getActiveProfileId).mockResolvedValue({
      success: true,
      data: VALID_UUID,
    });
    const useProfiles = await importHook();
    const { result } = renderHook(() => useProfiles());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeProfileId).toBe(VALID_UUID);
  });

  it('sets error when getProfiles fails', async () => {
    vi.mocked((window.screenShield as SettingsApi).getProfiles).mockResolvedValue({
      success: false,
      error: 'store error',
    });
    const useProfiles = await importHook();
    const { result } = renderHook(() => useProfiles());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('store error');
  });

  it('saveProfile calls window.screenShield.saveProfile', async () => {
    const useProfiles = await importHook();
    const { result } = renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const profile = makeProfile();
    await act(async () => {
      await result.current.saveProfile(profile);
    });

    expect(vi.mocked((window.screenShield as SettingsApi).saveProfile)).toHaveBeenCalledWith(
      profile,
    );
  });

  it('deleteProfile calls window.screenShield.deleteProfile', async () => {
    const useProfiles = await importHook();
    const { result } = renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteProfile(VALID_UUID);
    });

    expect(vi.mocked((window.screenShield as SettingsApi).deleteProfile)).toHaveBeenCalledWith(
      VALID_UUID,
    );
  });

  it('setActiveProfile calls window.screenShield.setActiveProfile', async () => {
    const useProfiles = await importHook();
    const { result } = renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setActiveProfile(VALID_UUID);
    });

    expect(
      vi.mocked((window.screenShield as SettingsApi).setActiveProfile),
    ).toHaveBeenCalledWith(VALID_UUID);
  });

  it('refreshes profiles after successful save', async () => {
    const profile = makeProfile();
    vi.mocked((window.screenShield as SettingsApi).getProfiles)
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValueOnce({ success: true, data: [profile] });
    const useProfiles = await importHook();
    const { result } = renderHook(() => useProfiles());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveProfile(profile);
    });

    await waitFor(() => expect(result.current.profiles).toEqual([profile]));
  });
});
