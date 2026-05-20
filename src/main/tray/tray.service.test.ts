import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSetToolTip, mockSetContextMenu, mockBuildFromTemplate, mockQuit, MockTray } =
  vi.hoisted(() => {
    const mockSetToolTip = vi.fn();
    const mockSetContextMenu = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MockTray = vi.fn(function (this: any, _iconPath: string) {
      this.setToolTip = mockSetToolTip;
      this.setContextMenu = mockSetContextMenu;
    });
    return {
      mockSetToolTip,
      mockSetContextMenu,
      mockBuildFromTemplate: vi.fn().mockReturnValue({}),
      mockQuit: vi.fn(),
      MockTray,
    };
  });

vi.mock('electron', () => ({
  Tray: MockTray,
  Menu: { buildFromTemplate: mockBuildFromTemplate },
  app: { quit: mockQuit },
}));

import { TrayService } from './tray.service.js';
import type { ProfileService } from '@main/profiles/profile.service.js';
import type { BlurProfile } from '@shared/types/profile.types.js';

interface TemplateItem {
  label?: string;
  type?: string;
  checked?: boolean;
  enabled?: boolean;
  click?: () => void;
}

function getLastTemplate(): TemplateItem[] {
  const calls = mockBuildFromTemplate.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? []) as TemplateItem[];
}

function findItem(template: TemplateItem[], label: string): TemplateItem {
  const item = template.find((i) => i.label === label);
  if (!item) throw new Error(`Menu item "${label}" not found in template`);
  return item;
}

function makeProfile(overrides: Partial<BlurProfile> = {}): BlurProfile {
  return {
    id: 'profile-1',
    name: 'Default',
    regions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeMockProfileService(overrides: Partial<ProfileService> = {}): ProfileService {
  return {
    getAllProfiles: vi.fn().mockReturnValue({ success: true, data: [] }),
    getActiveProfileId: vi.fn().mockReturnValue({ success: true, data: null }),
    createBlankProfile: vi.fn().mockReturnValue({
      success: true,
      data: makeProfile({ id: 'new-id', name: 'New Profile' }),
    }),
    setActiveProfile: vi.fn().mockReturnValue({ success: true, data: undefined }),
    getProfile: vi.fn(),
    saveProfile: vi.fn(),
    deleteProfile: vi.fn(),
    getActiveRegions: vi.fn().mockReturnValue([]),
    ...overrides,
  } as unknown as ProfileService;
}

describe('TrayService', () => {
  let profileService: ProfileService;
  let onOpenSettings: ReturnType<typeof vi.fn>;
  let onToggleActive: ReturnType<typeof vi.fn>;
  let onSelectProfile: ReturnType<typeof vi.fn>;
  let service: TrayService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildFromTemplate.mockReturnValue({});

    profileService = makeMockProfileService();
    onOpenSettings = vi.fn();
    onToggleActive = vi.fn();
    onSelectProfile = vi.fn();

    service = new TrayService(
      profileService,
      onOpenSettings as unknown as () => void,
      onToggleActive as unknown as (active: boolean) => void,
      onSelectProfile as unknown as (id: string) => void,
    );
  });

  describe('constructor', () => {
    it('creates a Tray instance', () => {
      expect(MockTray).toHaveBeenCalledOnce();
    });

    it('passes an icon path ending in .png', () => {
      const iconPath = MockTray.mock.calls[0]?.[0] as string;
      expect(iconPath).toMatch(/\.png$/);
    });

    it('icon path includes assets/icons', () => {
      const iconPath = MockTray.mock.calls[0]?.[0] as string;
      expect(iconPath).toMatch(/assets[/\\]icons[/\\]/);
    });

    it('sets the tooltip to ScreenShield', () => {
      expect(mockSetToolTip).toHaveBeenCalledWith('ScreenShield');
    });

    it('calls refresh() on construction (setContextMenu is called)', () => {
      expect(mockSetContextMenu).toHaveBeenCalledOnce();
    });
  });

  describe('refresh()', () => {
    it('calls getAllProfiles on the profile service', () => {
      expect(vi.mocked(profileService.getAllProfiles)).toHaveBeenCalled();
    });

    it('calls getActiveProfileId on the profile service', () => {
      expect(vi.mocked(profileService.getActiveProfileId)).toHaveBeenCalled();
    });

    it('calls Menu.buildFromTemplate with an array', () => {
      expect(mockBuildFromTemplate).toHaveBeenCalledOnce();
      const [template] = mockBuildFromTemplate.mock.calls[0] as [TemplateItem[]];
      expect(Array.isArray(template)).toBe(true);
    });

    it('calls tray.setContextMenu with the built menu', () => {
      const builtMenu = {};
      mockBuildFromTemplate.mockReturnValue(builtMenu);
      service.refresh();
      expect(mockSetContextMenu).toHaveBeenLastCalledWith(builtMenu);
    });
  });

  describe('menu structure', () => {
    it('has a disabled ScreenShield header as first item', () => {
      const template = getLastTemplate();
      expect(template[0]).toMatchObject({ label: 'ScreenShield', enabled: false });
    });

    it('has an Active checkbox item', () => {
      const template = getLastTemplate();
      const item = findItem(template, 'Active');
      expect(item.type).toBe('checkbox');
    });

    it('Active checkbox is unchecked by default', () => {
      const template = getLastTemplate();
      const item = findItem(template, 'Active');
      expect(item.checked).toBe(false);
    });

    it('has a New Profile... item', () => {
      const template = getLastTemplate();
      expect(template.some((i) => i.label === 'New Profile...')).toBe(true);
    });

    it('has an Edit Current... item', () => {
      const template = getLastTemplate();
      expect(template.some((i) => i.label === 'Edit Current...')).toBe(true);
    });

    it('has a Quit item', () => {
      const template = getLastTemplate();
      expect(template.some((i) => i.label === 'Quit')).toBe(true);
    });

    it('lists profiles as radio items', () => {
      const profiles = [
        makeProfile({ id: 'p1', name: 'Work' }),
        makeProfile({ id: 'p2', name: 'Gaming' }),
      ];
      vi.clearAllMocks();
      mockBuildFromTemplate.mockReturnValue({});
      profileService = makeMockProfileService({
        getAllProfiles: vi.fn().mockReturnValue({ success: true, data: profiles }),
        getActiveProfileId: vi.fn().mockReturnValue({ success: true, data: 'p1' }),
      });
      service = new TrayService(
        profileService,
        onOpenSettings as unknown as () => void,
        onToggleActive as unknown as (active: boolean) => void,
        onSelectProfile as unknown as (id: string) => void,
      );

      const template = getLastTemplate();
      const workItem = findItem(template, 'Work');
      const gamingItem = findItem(template, 'Gaming');

      expect(workItem.type).toBe('radio');
      expect(gamingItem.type).toBe('radio');
    });

    it('checks the active profile', () => {
      const profiles = [
        makeProfile({ id: 'p1', name: 'Work' }),
        makeProfile({ id: 'p2', name: 'Gaming' }),
      ];
      vi.clearAllMocks();
      mockBuildFromTemplate.mockReturnValue({});
      profileService = makeMockProfileService({
        getAllProfiles: vi.fn().mockReturnValue({ success: true, data: profiles }),
        getActiveProfileId: vi.fn().mockReturnValue({ success: true, data: 'p2' }),
      });
      service = new TrayService(
        profileService,
        onOpenSettings as unknown as () => void,
        onToggleActive as unknown as (active: boolean) => void,
        onSelectProfile as unknown as (id: string) => void,
      );

      const template = getLastTemplate();
      expect(findItem(template, 'Work').checked).toBe(false);
      expect(findItem(template, 'Gaming').checked).toBe(true);
    });
  });

  describe('menu click handlers', () => {
    it('toggle click calls onToggleActive(true) first time', () => {
      const template = getLastTemplate();
      findItem(template, 'Active').click?.();
      expect(onToggleActive).toHaveBeenCalledWith(true);
    });

    it('toggle click calls onToggleActive(false) second time', () => {
      const template = getLastTemplate();
      findItem(template, 'Active').click?.();
      // Refresh is NOT called on toggle — rebuild the template to get fresh click handler
      service.refresh();
      const template2 = getLastTemplate();
      findItem(template2, 'Active').click?.();
      expect(onToggleActive).toHaveBeenLastCalledWith(false);
    });

    it('Active checkbox reflects toggled state after refresh', () => {
      const template = getLastTemplate();
      findItem(template, 'Active').click?.();
      service.refresh();
      const template2 = getLastTemplate();
      expect(findItem(template2, 'Active').checked).toBe(true);
    });

    it('profile radio click calls onSelectProfile with profile id', () => {
      const profiles = [makeProfile({ id: 'p1', name: 'Work' })];
      vi.clearAllMocks();
      mockBuildFromTemplate.mockReturnValue({});
      profileService = makeMockProfileService({
        getAllProfiles: vi.fn().mockReturnValue({ success: true, data: profiles }),
        getActiveProfileId: vi.fn().mockReturnValue({ success: true, data: null }),
      });
      service = new TrayService(
        profileService,
        onOpenSettings as unknown as () => void,
        onToggleActive as unknown as (active: boolean) => void,
        onSelectProfile as unknown as (id: string) => void,
      );

      const template = getLastTemplate();
      findItem(template, 'Work').click?.();
      expect(onSelectProfile).toHaveBeenCalledWith('p1');
    });

    it('Edit Current... click calls onOpenSettings', () => {
      const template = getLastTemplate();
      findItem(template, 'Edit Current...').click?.();
      expect(onOpenSettings).toHaveBeenCalledOnce();
    });

    it('Quit click calls app.quit()', () => {
      const template = getLastTemplate();
      findItem(template, 'Quit').click?.();
      expect(mockQuit).toHaveBeenCalledOnce();
    });

    it('New Profile... click creates a blank profile', () => {
      const template = getLastTemplate();
      findItem(template, 'New Profile...').click?.();
      expect(vi.mocked(profileService.createBlankProfile)).toHaveBeenCalledWith('New Profile');
    });

    it('New Profile... click sets the new profile as active', () => {
      const template = getLastTemplate();
      findItem(template, 'New Profile...').click?.();
      expect(vi.mocked(profileService.setActiveProfile)).toHaveBeenCalledWith('new-id');
    });

    it('New Profile... click opens settings', () => {
      const template = getLastTemplate();
      findItem(template, 'New Profile...').click?.();
      expect(onOpenSettings).toHaveBeenCalledOnce();
    });

    it('New Profile... click does not open settings if creation fails', () => {
      vi.mocked(profileService.createBlankProfile).mockReturnValue({
        success: false,
        error: 'disk full',
      });
      const template = getLastTemplate();
      findItem(template, 'New Profile...').click?.();
      expect(onOpenSettings).not.toHaveBeenCalled();
    });
  });
});
