import { useState, useEffect, useCallback } from 'react';
import type { BlurProfile, IpcResult, SettingsApi } from '@shared/types/profile.types.js';

declare global {
  interface Window {
    readonly screenShield: SettingsApi;
  }
}

interface ProfilesState {
  profiles: readonly BlurProfile[];
  activeProfileId: string | null;
  loading: boolean;
  error: string | null;
}

export interface UseProfilesReturn extends ProfilesState {
  refresh: () => Promise<void>;
  saveProfile: (profile: BlurProfile) => Promise<IpcResult<BlurProfile>>;
  deleteProfile: (id: string) => Promise<IpcResult<void>>;
  setActiveProfile: (id: string | null) => Promise<IpcResult<void>>;
}

export function useProfiles(): UseProfilesReturn {
  const [state, setState] = useState<ProfilesState>({
    profiles: [],
    activeProfileId: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [profilesResult, activeIdResult] = await Promise.all([
        window.screenShield.getProfiles(),
        window.screenShield.getActiveProfileId(),
      ]);

      if (!profilesResult.success) {
        setState((prev) => ({ ...prev, loading: false, error: profilesResult.error }));
        return;
      }
      if (!activeIdResult.success) {
        setState((prev) => ({ ...prev, loading: false, error: activeIdResult.error }));
        return;
      }

      setState({
        profiles: profilesResult.data,
        activeProfileId: activeIdResult.data,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: `Failed to load profiles: ${String(err)}`,
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveProfile = useCallback(
    async (profile: BlurProfile): Promise<IpcResult<BlurProfile>> => {
      const result = await window.screenShield.saveProfile(profile);
      if (result.success) await refresh();
      return result;
    },
    [refresh],
  );

  const deleteProfile = useCallback(
    async (id: string): Promise<IpcResult<void>> => {
      const result = await window.screenShield.deleteProfile(id);
      if (result.success) await refresh();
      return result;
    },
    [refresh],
  );

  const setActiveProfile = useCallback(
    async (id: string | null): Promise<IpcResult<void>> => {
      const result = await window.screenShield.setActiveProfile(id);
      if (result.success) await refresh();
      return result;
    },
    [refresh],
  );

  return { ...state, refresh, saveProfile, deleteProfile, setActiveProfile };
}
