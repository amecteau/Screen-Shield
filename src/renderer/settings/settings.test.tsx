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

async function importApp() {
  const { App } = await import('./settings.js');
  return App;
}

describe('App', () => {
  it('renders ProfileList by default', async () => {
    const App = await importApp();
    render(<App />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByTestId('profile-list')).toBeTruthy();
  });

  it('navigates to RegionEditor when onEditProfile called', async () => {
    const profile = makeProfile({ id: 'p1', name: 'My Profile' });
    vi.mocked((window.screenShield as SettingsApi).getProfiles).mockResolvedValue({
      success: true,
      data: [profile],
    });
    const App = await importApp();
    render(<App />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.queryByTestId('profile-list')).toBeNull());
    expect(screen.getByTestId('region-editor')).toBeTruthy();
  });

  it('navigates back to ProfileList when onDone called from RegionEditor', async () => {
    const profile = makeProfile({ id: 'p1' });
    vi.mocked((window.screenShield as SettingsApi).getProfiles).mockResolvedValue({
      success: true,
      data: [profile],
    });
    const App = await importApp();
    render(<App />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByTestId('region-editor')).toBeTruthy());

    fireEvent.click(screen.getByTestId('cancel-btn'));
    await waitFor(() => expect(screen.getByTestId('profile-list')).toBeTruthy());
  });

  it('does not auto-mount when no root element in DOM', async () => {
    // The auto-mount code only runs if getElementById('root') returns a value.
    // Importing the module in happy-dom with no #root element should not throw.
    await importApp(); // just verifying no throw
    expect(document.getElementById('root')).toBeNull();
  });
});
