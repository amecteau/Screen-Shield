import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import { SettingsWindowController } from './settings.window.js';

interface MockWindow {
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  isVisible: ReturnType<typeof vi.fn>;
}

describe('SettingsWindowController', () => {
  let mockWin: MockWindow;
  let controller: SettingsWindowController;

  beforeEach(() => {
    mockWin = {
      show: vi.fn(),
      hide: vi.fn(),
      focus: vi.fn(),
      isVisible: vi.fn().mockReturnValue(false),
    };
    controller = new SettingsWindowController(mockWin as unknown as BrowserWindow);
  });

  describe('show()', () => {
    it('calls win.show()', () => {
      controller.show();
      expect(mockWin.show).toHaveBeenCalledOnce();
    });

    it('calls win.focus()', () => {
      controller.show();
      expect(mockWin.focus).toHaveBeenCalledOnce();
    });

    it('calls show before focus', () => {
      const order: string[] = [];
      mockWin.show.mockImplementation(() => order.push('show'));
      mockWin.focus.mockImplementation(() => order.push('focus'));

      controller.show();

      expect(order).toEqual(['show', 'focus']);
    });
  });

  describe('hide()', () => {
    it('calls win.hide()', () => {
      controller.hide();
      expect(mockWin.hide).toHaveBeenCalledOnce();
    });
  });

  describe('isVisible()', () => {
    it('returns false when the window is hidden', () => {
      mockWin.isVisible.mockReturnValue(false);
      expect(controller.isVisible()).toBe(false);
    });

    it('returns true when the window is visible', () => {
      mockWin.isVisible.mockReturnValue(true);
      expect(controller.isVisible()).toBe(true);
    });

    it('delegates directly to win.isVisible()', () => {
      controller.isVisible();
      expect(mockWin.isVisible).toHaveBeenCalledOnce();
    });
  });
});
