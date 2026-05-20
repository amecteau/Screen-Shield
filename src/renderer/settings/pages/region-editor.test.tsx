// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { BlurProfile, IpcResult, SettingsApi } from '@shared/types/profile.types.js';

const VALID_UUID = '12345678-1234-1234-1234-123456789012';

function makeProfile(overrides: Partial<BlurProfile> = {}): BlurProfile {
  return {
    id: VALID_UUID,
    name: 'Work Profile',
    regions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeApi(overrides: Partial<SettingsApi> = {}): SettingsApi {
  return {
    getProfiles: vi.fn().mockResolvedValue({ success: true, data: [makeProfile()] } satisfies IpcResult<readonly BlurProfile[]>),
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
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function importComponent() {
  const { RegionEditor } = await import('./region-editor.js');
  return RegionEditor;
}

describe('RegionEditor', () => {
  it('shows loading state initially', async () => {
    const RegionEditor = await importComponent();
    render(<RegionEditor profileId={VALID_UUID} onDone={vi.fn()} />);
    expect(screen.getByTestId('loading')).toBeTruthy();
  });

  it('shows editor after loading', async () => {
    const RegionEditor = await importComponent();
    render(<RegionEditor profileId={VALID_UUID} onDone={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByTestId('region-editor')).toBeTruthy();
  });

  it('shows error state when getProfiles fails', async () => {
    vi.mocked((window.screenShield as SettingsApi).getProfiles).mockResolvedValue({
      success: false,
      error: 'load failure',
    });
    const RegionEditor = await importComponent();
    render(<RegionEditor profileId={VALID_UUID} onDone={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByTestId('error')).toBeTruthy();
  });

  it('renders profile name', async () => {
    const RegionEditor = await importComponent();
    render(<RegionEditor profileId={VALID_UUID} onDone={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByText('Work Profile')).toBeTruthy();
  });

  it('calls onDone when Cancel clicked', async () => {
    const onDone = vi.fn();
    const RegionEditor = await importComponent();
    render(<RegionEditor profileId={VALID_UUID} onDone={onDone} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByTestId('cancel-btn'));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('calls saveProfile when Save clicked', async () => {
    const RegionEditor = await importComponent();
    render(<RegionEditor profileId={VALID_UUID} onDone={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByTestId('save-btn'));

    await waitFor(() =>
      expect(vi.mocked((window.screenShield as SettingsApi).saveProfile)).toHaveBeenCalledOnce(),
    );
  });

  it('calls onDone after successful save', async () => {
    const onDone = vi.fn();
    const RegionEditor = await importComponent();
    render(<RegionEditor profileId={VALID_UUID} onDone={onDone} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it('shows save error on save failure', async () => {
    vi.mocked((window.screenShield as SettingsApi).saveProfile).mockResolvedValue({
      success: false,
      error: 'save failed',
    });
    const RegionEditor = await importComponent();
    render(<RegionEditor profileId={VALID_UUID} onDone={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(screen.getByTestId('save-error')).toBeTruthy());
    expect(screen.getByText('save failed')).toBeTruthy();
  });

  it('disables save button while saving', async () => {
    let resolveSave!: (v: IpcResult<BlurProfile>) => void;
    vi.mocked((window.screenShield as SettingsApi).saveProfile).mockReturnValue(
      new Promise<IpcResult<BlurProfile>>((res) => { resolveSave = res; }),
    );
    const RegionEditor = await importComponent();
    render(<RegionEditor profileId={VALID_UUID} onDone={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());

    fireEvent.click(screen.getByTestId('save-btn'));
    expect((screen.getByTestId('save-btn') as HTMLButtonElement).disabled).toBe(true);

    resolveSave({ success: true, data: makeProfile() });
  });

  it('renders region canvas', async () => {
    const RegionEditor = await importComponent();
    render(<RegionEditor profileId={VALID_UUID} onDone={vi.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
    expect(screen.getByTestId('region-canvas')).toBeTruthy();
  });
});
