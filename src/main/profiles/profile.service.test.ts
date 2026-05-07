import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileService, type ProfileStore } from './profile.service.js';

/**
 * In-memory mock store — replaces electron-store for testing.
 * This is a computational feedback sensor: it validates profile
 * service behavior without filesystem side effects.
 */
class MockStore implements ProfileStore {
  private data = new Map<string, unknown>();

  get(key: string): unknown {
    return this.data.get(key);
  }

  set(key: string, value: unknown): void {
    this.data.set(key, value);
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }
}

function makeValidProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Profile',
    regions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProfileService', () => {
  let store: MockStore;
  let service: ProfileService;

  beforeEach(() => {
    store = new MockStore();
    service = new ProfileService(store);
  });

  describe('getAllProfiles', () => {
    it('returns empty array when no profiles exist', () => {
      const result = service.getAllProfiles();
      expect(result).toEqual({ success: true, data: [] });
    });

    it('returns stored profiles', () => {
      const profile = makeValidProfile();
      store.set('profiles', [profile]);

      const result = service.getAllProfiles();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]?.name).toBe('Test Profile');
      }
    });
  });

  describe('saveProfile', () => {
    it('saves a valid profile', () => {
      const result = service.saveProfile(makeValidProfile());
      expect(result.success).toBe(true);
    });

    it('rejects profile with missing name', () => {
      const result = service.saveProfile(makeValidProfile({ name: '' }));
      expect(result.success).toBe(false);
    });

    it('rejects profile with invalid region coordinates', () => {
      const result = service.saveProfile(
        makeValidProfile({
          regions: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              x: 90,
              y: 10,
              width: 20, // extends beyond screen (90 + 20 = 110)
              height: 30,
              blurStrength: 20,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });

    it('rejects region with NaN coordinates', () => {
      const result = service.saveProfile(
        makeValidProfile({
          regions: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              x: NaN,
              y: 10,
              width: 20,
              height: 30,
              blurStrength: 20,
            },
          ],
        }),
      );
      expect(result.success).toBe(false);
    });

    it('updates existing profile by id', () => {
      const profile = makeValidProfile();
      service.saveProfile(profile);
      service.saveProfile(makeValidProfile({ name: 'Updated' }));

      const result = service.getAllProfiles();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]?.name).toBe('Updated');
      }
    });

    it('updates the updatedAt timestamp', () => {
      const before = new Date().toISOString();
      const result = service.saveProfile(makeValidProfile());

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updatedAt >= before).toBe(true);
      }
    });
  });

  describe('deleteProfile', () => {
    it('deletes an existing profile', () => {
      service.saveProfile(makeValidProfile());
      const result = service.deleteProfile('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);

      const allResult = service.getAllProfiles();
      expect(allResult.success).toBe(true);
      if (allResult.success) {
        expect(allResult.data).toHaveLength(0);
      }
    });

    it('returns error for non-existent profile', () => {
      const result = service.deleteProfile('550e8400-e29b-41d4-a716-446655440099');
      expect(result.success).toBe(false);
    });

    it('clears active profile when deleted', () => {
      service.saveProfile(makeValidProfile());
      service.setActiveProfile('550e8400-e29b-41d4-a716-446655440000');
      service.deleteProfile('550e8400-e29b-41d4-a716-446655440000');

      const activeResult = service.getActiveProfileId();
      expect(activeResult).toEqual({ success: true, data: null });
    });
  });

  describe('setActiveProfile', () => {
    it('sets active profile to a valid id', () => {
      service.saveProfile(makeValidProfile());
      const result = service.setActiveProfile('550e8400-e29b-41d4-a716-446655440000');
      expect(result.success).toBe(true);
    });

    it('rejects non-existent profile id', () => {
      const result = service.setActiveProfile('550e8400-e29b-41d4-a716-446655440099');
      expect(result.success).toBe(false);
    });

    it('clears active profile when set to null', () => {
      service.saveProfile(makeValidProfile());
      service.setActiveProfile('550e8400-e29b-41d4-a716-446655440000');
      service.setActiveProfile(null);

      const result = service.getActiveProfileId();
      expect(result).toEqual({ success: true, data: null });
    });
  });

  describe('getActiveRegions', () => {
    it('returns empty array when no active profile', () => {
      expect(service.getActiveRegions()).toEqual([]);
    });

    it('returns regions from active profile', () => {
      const regions = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          blurStrength: 20,
        },
      ];
      service.saveProfile(makeValidProfile({ regions }));
      service.setActiveProfile('550e8400-e29b-41d4-a716-446655440000');

      const result = service.getActiveRegions();
      expect(result).toHaveLength(1);
      expect(result[0]?.x).toBe(10);
    });
  });
});
