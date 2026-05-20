// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue(VALID_UUID) });
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function importComponent() {
  const { ProfileList } = await import('./profile-list.js');
  return ProfileList;
}

describe('ProfileList', () => {
  it('shows loading state initially', async () => {
    const ProfileList = await importComponent();
    render(<ProfileList onEditProfile={vi.fn()} />);
    expect(screen.getByTestId('loading')).toBeTruthy();
  });

  it('shows empty message when no profiles', async () => {
    const ProfileList = await importComponent();
    render(<ProfileList onEditProfile={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByTestId('empty-message')).toBeTruthy();
  });

  it('renders profiles', async () => {
    const profile = makeProfile({ name: 'Work Profile' });
    vi.mocked((window.screenShield as SettingsApi).getProfiles).mockResolvedValue({
      success: true,
      data: [profile],
    });
    const ProfileList = await importComponent();
    render(<ProfileList onEditProfile={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByText('Work Profile')).toBeTruthy();
  });

  it('shows error state when getProfiles fails', async () => {
    vi.mocked((window.screenShield as SettingsApi).getProfiles).mockResolvedValue({
      success: false,
      error: 'disk error',
    });
    const ProfileList = await importComponent();
    render(<ProfileList onEditProfile={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByTestId('error')).toBeTruthy();
    expect(screen.getByText(/disk error/)).toBeTruthy();
  });

  it('shows new profile form when New Profile button clicked', async () => {
    const ProfileList = await importComponent();
    render(<ProfileList onEditProfile={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByTestId('new-profile-btn'));
    expect(screen.getByTestId('new-profile-form')).toBeTruthy();
  });

  it('hides new profile button when form is shown', async () => {
    const ProfileList = await importComponent();
    render(<ProfileList onEditProfile={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByTestId('new-profile-btn'));
    expect(screen.queryByTestId('new-profile-btn')).toBeNull();
  });

  it('cancels new profile form', async () => {
    const ProfileList = await importComponent();
    render(<ProfileList onEditProfile={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByTestId('new-profile-btn'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('new-profile-form')).toBeNull();
    expect(screen.getByTestId('new-profile-btn')).toBeTruthy();
  });

  it('creates a profile on form submit', async () => {
    vi.mocked((window.screenShield as SettingsApi).getProfiles)
      .mockResolvedValueOnce({ success: true, data: [] })
      .mockResolvedValue({ success: true, data: [makeProfile({ name: 'New Profile' })] });
    const ProfileList = await importComponent();
    render(<ProfileList onEditProfile={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByTestId('new-profile-btn'));
    fireEvent.change(screen.getByTestId('new-profile-name'), { target: { value: 'New Profile' } });
    fireEvent.submit(screen.getByTestId('new-profile-form'));

    await waitFor(() =>
      expect(vi.mocked((window.screenShield as SettingsApi).saveProfile)).toHaveBeenCalledOnce(),
    );
    const [savedProfile] = vi.mocked((window.screenShield as SettingsApi).saveProfile).mock
      .calls[0] as [BlurProfile];
    expect(savedProfile.name).toBe('New Profile');
    expect(savedProfile.regions).toEqual([]);
  });

  it('does not submit form with empty name', async () => {
    const ProfileList = await importComponent();
    render(<ProfileList onEditProfile={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByTestId('new-profile-btn'));
    fireEvent.submit(screen.getByTestId('new-profile-form'));

    expect(vi.mocked((window.screenShield as SettingsApi).saveProfile)).not.toHaveBeenCalled();
  });

  it('calls onEditProfile when Edit clicked', async () => {
    const profile = makeProfile({ id: 'p1' });
    vi.mocked((window.screenShield as SettingsApi).getProfiles).mockResolvedValue({
      success: true,
      data: [profile],
    });
    const onEditProfile = vi.fn();
    const ProfileList = await importComponent();
    render(<ProfileList onEditProfile={onEditProfile} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByText('Edit'));
    expect(onEditProfile).toHaveBeenCalledWith('p1');
  });
});
