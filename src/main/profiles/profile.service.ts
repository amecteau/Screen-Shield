import { randomUUID } from 'node:crypto';
import { BlurProfileSchema } from './profile.schema.js';
import type { BlurProfile, BlurRegion, IpcResult } from '../../renderer/shared/types/index.js';

/**
 * Storage interface — abstracts electron-store for testability.
 * In production, this wraps electron-store. In tests, it's a simple Map.
 */
export interface ProfileStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  delete(key: string): void;
  has(key: string): boolean;
}

const PROFILES_KEY = 'profiles';
const ACTIVE_PROFILE_KEY = 'activeProfileId';

/**
 * Profile service — manages CRUD for blur profiles with Zod validation.
 *
 * All public methods return IpcResult<T> — never throw.
 * Validation happens on every write operation (feedforward via Zod schema).
 */
export class ProfileService {
  constructor(private readonly store: ProfileStore) {}

  getAllProfiles(): IpcResult<readonly BlurProfile[]> {
    try {
      const raw = this.store.get(PROFILES_KEY);
      const profiles = Array.isArray(raw) ? raw : [];
      return { success: true, data: profiles as BlurProfile[] };
    } catch (error) {
      return { success: false, error: `Failed to load profiles: ${String(error)}` };
    }
  }

  getProfile(id: string): IpcResult<BlurProfile> {
    const allResult = this.getAllProfiles();
    if (!allResult.success) return allResult;

    const profile = allResult.data.find((p) => p.id === id);
    if (!profile) {
      return { success: false, error: `Profile not found: ${id}` };
    }
    return { success: true, data: profile };
  }

  saveProfile(input: unknown): IpcResult<BlurProfile> {
    const parsed = BlurProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid profile data: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    const profile: BlurProfile = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    try {
      const allResult = this.getAllProfiles();
      const profiles = allResult.success ? [...allResult.data] : [];

      const existingIndex = profiles.findIndex((p) => p.id === profile.id);
      if (existingIndex >= 0) {
        profiles[existingIndex] = profile;
      } else {
        profiles.push(profile);
      }

      this.store.set(PROFILES_KEY, profiles);
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: `Failed to save profile: ${String(error)}` };
    }
  }

  deleteProfile(id: string): IpcResult<void> {
    try {
      const allResult = this.getAllProfiles();
      if (!allResult.success) return allResult;

      const filtered = allResult.data.filter((p) => p.id !== id);
      if (filtered.length === allResult.data.length) {
        return { success: false, error: `Profile not found: ${id}` };
      }

      this.store.set(PROFILES_KEY, filtered);

      // Clear active profile if it was deleted
      const activeId = this.store.get(ACTIVE_PROFILE_KEY);
      if (activeId === id) {
        this.store.delete(ACTIVE_PROFILE_KEY);
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to delete profile: ${String(error)}` };
    }
  }

  setActiveProfile(id: string | null): IpcResult<void> {
    try {
      if (id === null) {
        this.store.delete(ACTIVE_PROFILE_KEY);
        return { success: true, data: undefined };
      }

      // Verify profile exists
      const profileResult = this.getProfile(id);
      if (!profileResult.success) return profileResult;

      this.store.set(ACTIVE_PROFILE_KEY, id);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Failed to set active profile: ${String(error)}` };
    }
  }

  getActiveProfileId(): IpcResult<string | null> {
    try {
      const id = this.store.get(ACTIVE_PROFILE_KEY);
      return { success: true, data: typeof id === 'string' ? id : null };
    } catch (error) {
      return { success: false, error: `Failed to get active profile: ${String(error)}` };
    }
  }

  /**
   * Get the regions for the currently active profile.
   * Returns empty array if no profile is active.
   */
  getActiveRegions(): readonly BlurRegion[] {
    const activeResult = this.getActiveProfileId();
    if (!activeResult.success || activeResult.data === null) return [];

    const profileResult = this.getProfile(activeResult.data);
    if (!profileResult.success) return [];

    return profileResult.data.regions;
  }

  /**
   * Create a new blank profile with a generated ID.
   */
  createBlankProfile(name: string): IpcResult<BlurProfile> {
    const now = new Date().toISOString();
    return this.saveProfile({
      id: randomUUID(),
      name,
      regions: [],
      createdAt: now,
      updatedAt: now,
    });
  }
}
