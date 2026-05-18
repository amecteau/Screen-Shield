import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockOnHeadersReceived } = vi.hoisted(() => ({
  mockOnHeadersReceived: vi.fn(),
}));

vi.mock('electron', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BrowserWindow = vi.fn(function MockBrowserWindow(this: any) {
    this.loadFile = vi.fn().mockResolvedValue(undefined);
    this.setIgnoreMouseEvents = vi.fn();
    this.hide = vi.fn();
    this.on = vi.fn();
  });

  return {
    BrowserWindow,
    session: {
      defaultSession: {
        webRequest: { onHeadersReceived: mockOnHeadersReceived },
      },
    },
  };
});

import { BrowserWindow } from 'electron';
import {
  createOverlayWindow,
  createSettingsWindow,
  setupContentSecurityPolicy,
} from './window.factory.js';

interface MockWindow {
  loadFile: ReturnType<typeof vi.fn>;
  setIgnoreMouseEvents: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

function lastWindow(): MockWindow {
  const calls = vi.mocked(BrowserWindow).mock.results;
  return calls[calls.length - 1]?.value as MockWindow;
}

function getWindowOptions(): Electron.BrowserWindowConstructorOptions {
  const calls = vi.mocked(BrowserWindow).mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as Electron.BrowserWindowConstructorOptions;
}

function getCloseHandler(
  win: MockWindow,
): ((event: { preventDefault: () => void }) => void) | undefined {
  const call = win.on.mock.calls.find((args) => args[0] === 'close');
  return call?.[1] as ((event: { preventDefault: () => void }) => void) | undefined;
}

describe('setupContentSecurityPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers an onHeadersReceived listener', () => {
    setupContentSecurityPolicy();
    expect(mockOnHeadersReceived).toHaveBeenCalledOnce();
  });

  it('injects the Content-Security-Policy header', () => {
    setupContentSecurityPolicy();
    const handler = mockOnHeadersReceived.mock.calls[0]?.[0] as (
      details: { responseHeaders: Record<string, string[]> },
      cb: (r: { responseHeaders: Record<string, string[]> }) => void,
    ) => void;

    const cb = vi.fn();
    handler({ responseHeaders: {} }, cb);

    expect(cb).toHaveBeenCalledWith({
      responseHeaders: {
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
        ],
      },
    });
  });

  it('preserves existing response headers', () => {
    setupContentSecurityPolicy();
    const handler = mockOnHeadersReceived.mock.calls[0]?.[0] as (
      details: { responseHeaders: Record<string, string[]> },
      cb: (r: { responseHeaders: Record<string, string[]> }) => void,
    ) => void;

    const cb = vi.fn();
    handler({ responseHeaders: { 'X-Frame-Options': ['SAMEORIGIN'] } }, cb);

    const result = cb.mock.calls[0]?.[0] as { responseHeaders: Record<string, string[]> };
    expect(result.responseHeaders['X-Frame-Options']).toEqual(['SAMEORIGIN']);
    expect(result.responseHeaders['Content-Security-Policy']).toBeDefined();
  });
});

describe('createOverlayWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets nodeIntegration: false', () => {
    createOverlayWindow('/preload.js');
    expect(getWindowOptions().webPreferences?.nodeIntegration).toBe(false);
  });

  it('sets contextIsolation: true', () => {
    createOverlayWindow('/preload.js');
    expect(getWindowOptions().webPreferences?.contextIsolation).toBe(true);
  });

  it('sets sandbox: true', () => {
    createOverlayWindow('/preload.js');
    expect(getWindowOptions().webPreferences?.sandbox).toBe(true);
  });

  it('passes the preload path to webPreferences', () => {
    createOverlayWindow('/path/to/overlay.preload.js');
    expect(getWindowOptions().webPreferences?.preload).toBe('/path/to/overlay.preload.js');
  });

  it('creates a frameless window', () => {
    createOverlayWindow('/preload.js');
    expect(getWindowOptions().frame).toBe(false);
  });

  it('creates a transparent window', () => {
    createOverlayWindow('/preload.js');
    expect(getWindowOptions().transparent).toBe(true);
  });

  it('creates an always-on-top window', () => {
    createOverlayWindow('/preload.js');
    expect(getWindowOptions().alwaysOnTop).toBe(true);
  });

  it('hides the window from the taskbar', () => {
    createOverlayWindow('/preload.js');
    expect(getWindowOptions().skipTaskbar).toBe(true);
  });

  it('calls setIgnoreMouseEvents(true)', () => {
    createOverlayWindow('/preload.js');
    expect(lastWindow().setIgnoreMouseEvents).toHaveBeenCalledWith(true);
  });

  it('loads the overlay HTML file', () => {
    createOverlayWindow('/preload.js');
    const [calledPath] = lastWindow().loadFile.mock.calls[0] as [string];
    expect(calledPath).toMatch(/overlay[/\\]index\.html$/);
  });

  it('returns the BrowserWindow instance', () => {
    const win = createOverlayWindow('/preload.js');
    expect(win).toBe(lastWindow());
  });
});

describe('createSettingsWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets nodeIntegration: false', () => {
    createSettingsWindow('/preload.js');
    expect(getWindowOptions().webPreferences?.nodeIntegration).toBe(false);
  });

  it('sets contextIsolation: true', () => {
    createSettingsWindow('/preload.js');
    expect(getWindowOptions().webPreferences?.contextIsolation).toBe(true);
  });

  it('sets sandbox: true', () => {
    createSettingsWindow('/preload.js');
    expect(getWindowOptions().webPreferences?.sandbox).toBe(true);
  });

  it('passes the preload path to webPreferences', () => {
    createSettingsWindow('/path/to/settings.preload.js');
    expect(getWindowOptions().webPreferences?.preload).toBe('/path/to/settings.preload.js');
  });

  it('creates an 800x600 window', () => {
    createSettingsWindow('/preload.js');
    expect(getWindowOptions().width).toBe(800);
    expect(getWindowOptions().height).toBe(600);
  });

  it('starts hidden', () => {
    createSettingsWindow('/preload.js');
    expect(getWindowOptions().show).toBe(false);
  });

  it('hides instead of closing when close is triggered', () => {
    createSettingsWindow('/preload.js');
    const win = lastWindow();
    const handler = getCloseHandler(win);

    const event = { preventDefault: vi.fn() };
    handler?.(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(win.hide).toHaveBeenCalledOnce();
  });

  it('loads the settings HTML file', () => {
    createSettingsWindow('/preload.js');
    const [calledPath] = lastWindow().loadFile.mock.calls[0] as [string];
    expect(calledPath).toMatch(/settings[/\\]index\.html$/);
  });

  it('returns the BrowserWindow instance', () => {
    const win = createSettingsWindow('/preload.js');
    expect(win).toBe(lastWindow());
  });
});
