// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BlurRegion } from '@shared/types/profile.types.js';

// Callbacks captured when overlay.ts calls window.screenShield.on*()
let regionsCallback: (regions: readonly BlurRegion[]) => void = () => {};
let settingsModeCallback: (active: boolean) => void = () => {};

function makeRegion(overrides: Partial<BlurRegion> = {}): BlurRegion {
  return {
    id: 'test-region-id',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    blurStrength: 15,
    ...overrides,
  };
}

async function loadOverlay(): Promise<void> {
  vi.stubGlobal('screenShield', {
    onRegionsUpdate: vi.fn((cb: (regions: readonly BlurRegion[]) => void) => {
      regionsCallback = cb;
    }),
    onSettingsModeChange: vi.fn((cb: (active: boolean) => void) => {
      settingsModeCallback = cb;
    }),
  });

  vi.resetModules();
  await import('./overlay.js');
}

beforeEach(async () => {
  document.body.innerHTML = '<div id="overlay-root"></div>';
  await loadOverlay();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('initOverlay', () => {
  it('registers a regions update callback on window.screenShield', () => {
    const screenShield = (window as unknown as Record<string, unknown>).screenShield as {
      onRegionsUpdate: ReturnType<typeof vi.fn>;
    };
    expect(screenShield.onRegionsUpdate).toHaveBeenCalledOnce();
  });

  it('registers a settings mode change callback on window.screenShield', () => {
    const screenShield = (window as unknown as Record<string, unknown>).screenShield as {
      onSettingsModeChange: ReturnType<typeof vi.fn>;
    };
    expect(screenShield.onSettingsModeChange).toHaveBeenCalledOnce();
  });

  it('does nothing when overlay-root element is absent', async () => {
    document.body.innerHTML = '';
    vi.stubGlobal('screenShield', {
      onRegionsUpdate: vi.fn(),
      onSettingsModeChange: vi.fn(),
    });
    vi.resetModules();
    await import('./overlay.js');
    // No error thrown and no root to check — just verifying graceful handling
    expect(document.getElementById('overlay-root')).toBeNull();
  });
});

describe('region rendering', () => {
  it('root starts empty before any region update', () => {
    const root = document.getElementById('overlay-root')!;
    expect(root.children.length).toBe(0);
  });

  it('creates one div per region', () => {
    regionsCallback([makeRegion(), makeRegion({ id: 'r2' })]);
    const root = document.getElementById('overlay-root')!;
    expect(root.children.length).toBe(2);
  });

  it('creates no divs for an empty regions array', () => {
    regionsCallback([]);
    const root = document.getElementById('overlay-root')!;
    expect(root.children.length).toBe(0);
  });

  it('sets left position in vw units matching region.x', () => {
    regionsCallback([makeRegion({ x: 25 })]);
    const div = document.getElementById('overlay-root')!.children[0] as HTMLElement;
    expect(div.style.left).toBe('25vw');
  });

  it('sets top position in vh units matching region.y', () => {
    regionsCallback([makeRegion({ y: 35 })]);
    const div = document.getElementById('overlay-root')!.children[0] as HTMLElement;
    expect(div.style.top).toBe('35vh');
  });

  it('sets width in vw units matching region.width', () => {
    regionsCallback([makeRegion({ width: 50 })]);
    const div = document.getElementById('overlay-root')!.children[0] as HTMLElement;
    expect(div.style.width).toBe('50vw');
  });

  it('sets height in vh units matching region.height', () => {
    regionsCallback([makeRegion({ height: 60 })]);
    const div = document.getElementById('overlay-root')!.children[0] as HTMLElement;
    expect(div.style.height).toBe('60vh');
  });

  it('sets backdrop-filter blur using region.blurStrength', () => {
    regionsCallback([makeRegion({ blurStrength: 20 })]);
    const div = document.getElementById('overlay-root')!.children[0] as HTMLElement;
    expect(div.style.backdropFilter).toBe('blur(20px)');
  });

  it('sets near-transparent background in normal mode', () => {
    regionsCallback([makeRegion()]);
    const div = document.getElementById('overlay-root')!.children[0] as HTMLElement;
    expect(div.style.background).toBe('rgba(0, 0, 0, 0.01)');
  });

  it('root background is transparent in normal mode', () => {
    regionsCallback([makeRegion()]);
    const root = document.getElementById('overlay-root')!;
    expect(root.style.background).toBe('transparent');
  });

  it('clears old region divs before rendering new ones', () => {
    regionsCallback([makeRegion()]);
    regionsCallback([makeRegion(), makeRegion({ id: 'r2' }), makeRegion({ id: 'r3' })]);
    const root = document.getElementById('overlay-root')!;
    expect(root.children.length).toBe(3);
  });

  it('replaces all divs on each update', () => {
    regionsCallback([makeRegion(), makeRegion({ id: 'r2' })]);
    regionsCallback([makeRegion()]);
    const root = document.getElementById('overlay-root')!;
    expect(root.children.length).toBe(1);
  });
});

describe('settings mode', () => {
  it('sets tinted root background when settings mode is active', () => {
    settingsModeCallback(true);
    const root = document.getElementById('overlay-root')!;
    expect(root.style.background).toBe('rgba(0, 0, 0, 0.2)');
  });

  it('restores transparent root background when settings mode is deactivated', () => {
    settingsModeCallback(true);
    settingsModeCallback(false);
    const root = document.getElementById('overlay-root')!;
    expect(root.style.background).toBe('transparent');
  });

  it('adds visible border to region divs in settings mode', () => {
    regionsCallback([makeRegion()]);
    settingsModeCallback(true);
    const div = document.getElementById('overlay-root')!.children[0] as HTMLElement;
    expect(div.style.border).toBeTruthy();
  });

  it('uses distinct background for region divs in settings mode', () => {
    regionsCallback([makeRegion()]);
    settingsModeCallback(true);
    const div = document.getElementById('overlay-root')!.children[0] as HTMLElement;
    expect(div.style.background).not.toBe('rgba(0, 0, 0, 0.01)');
  });

  it('re-renders current regions when settings mode changes', () => {
    regionsCallback([makeRegion(), makeRegion({ id: 'r2' })]);
    settingsModeCallback(true);
    const root = document.getElementById('overlay-root')!;
    expect(root.children.length).toBe(2);
  });

  it('preserves current settings mode when regions update', () => {
    settingsModeCallback(true);
    regionsCallback([makeRegion()]);
    const root = document.getElementById('overlay-root')!;
    expect(root.style.background).toBe('rgba(0, 0, 0, 0.2)');
  });
});
