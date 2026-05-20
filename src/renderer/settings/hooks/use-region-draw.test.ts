// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRegionDraw } from './use-region-draw.js';
import type { BlurRegion } from '@shared/types/profile.types.js';

function makeRegion(overrides: Partial<BlurRegion> = {}): BlurRegion {
  return {
    id: 'region-1',
    x: 10,
    y: 10,
    width: 30,
    height: 20,
    blurStrength: 20,
    ...overrides,
  };
}

describe('useRegionDraw', () => {
  it('initializes with provided regions', () => {
    const region = makeRegion();
    const { result } = renderHook(() => useRegionDraw([region]));
    expect(result.current.regions).toEqual([region]);
  });

  it('starts with no draft, no selection', () => {
    const { result } = renderHook(() => useRegionDraw([]));
    expect(result.current.draftRegion).toBeNull();
    expect(result.current.selectedRegionId).toBeNull();
  });

  describe('drawing', () => {
    it('creates draft region while drawing', () => {
      const { result } = renderHook(() => useRegionDraw([]));

      act(() => result.current.startDraw(10, 10));
      act(() => result.current.updateDraw(50, 40));

      expect(result.current.draftRegion).not.toBeNull();
      expect(result.current.draftRegion?.x).toBe(10);
      expect(result.current.draftRegion?.y).toBe(10);
      expect(result.current.draftRegion?.width).toBe(40);
      expect(result.current.draftRegion?.height).toBe(30);
    });

    it('handles drawing in any direction (normalizes coords)', () => {
      const { result } = renderHook(() => useRegionDraw([]));

      act(() => result.current.startDraw(50, 50));
      act(() => result.current.updateDraw(10, 20));

      expect(result.current.draftRegion?.x).toBe(10);
      expect(result.current.draftRegion?.y).toBe(20);
      expect(result.current.draftRegion?.width).toBe(40);
      expect(result.current.draftRegion?.height).toBe(30);
    });

    it('commits draft as region when large enough', () => {
      const { result } = renderHook(() => useRegionDraw([]));

      act(() => result.current.startDraw(10, 10));
      act(() => result.current.updateDraw(50, 40));
      act(() => result.current.commitDraw());

      expect(result.current.regions).toHaveLength(1);
      expect(result.current.draftRegion).toBeNull();
      expect(result.current.regions[0]?.x).toBe(10);
      expect(result.current.regions[0]?.y).toBe(10);
    });

    it('discards draft if too small on commit', () => {
      const { result } = renderHook(() => useRegionDraw([]));

      act(() => result.current.startDraw(10, 10));
      act(() => result.current.updateDraw(11, 11)); // 1% x 1% — below MIN_REGION_SIZE=2
      act(() => result.current.commitDraw());

      expect(result.current.regions).toHaveLength(0);
      expect(result.current.draftRegion).toBeNull();
    });

    it('cancelDraw clears draft without adding region', () => {
      const { result } = renderHook(() => useRegionDraw([]));

      act(() => result.current.startDraw(10, 10));
      act(() => result.current.updateDraw(50, 40));
      act(() => result.current.cancelDraw());

      expect(result.current.draftRegion).toBeNull();
      expect(result.current.regions).toHaveLength(0);
    });

    it('startDraw clears selection', () => {
      const region = makeRegion();
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.selectRegion('region-1'));
      expect(result.current.selectedRegionId).toBe('region-1');

      act(() => result.current.startDraw(10, 10));
      expect(result.current.selectedRegionId).toBeNull();
    });

    it('clamps draw coordinates to 0-100', () => {
      const { result } = renderHook(() => useRegionDraw([]));

      act(() => result.current.startDraw(-10, -10));
      act(() => result.current.updateDraw(110, 110));

      expect(result.current.draftRegion?.x).toBe(0);
      expect(result.current.draftRegion?.y).toBe(0);
      expect(result.current.draftRegion?.width).toBe(100);
      expect(result.current.draftRegion?.height).toBe(100);
    });
  });

  describe('selection', () => {
    it('selectRegion sets selectedRegionId', () => {
      const region = makeRegion();
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.selectRegion('region-1'));
      expect(result.current.selectedRegionId).toBe('region-1');
    });

    it('clearSelection sets selectedRegionId to null', () => {
      const region = makeRegion();
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.selectRegion('region-1'));
      act(() => result.current.clearSelection());
      expect(result.current.selectedRegionId).toBeNull();
    });

    it('deleteSelectedRegion removes selected region', () => {
      const region = makeRegion();
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.selectRegion('region-1'));
      act(() => result.current.deleteSelectedRegion());

      expect(result.current.regions).toHaveLength(0);
      expect(result.current.selectedRegionId).toBeNull();
    });

    it('deleteSelectedRegion does nothing if no selection', () => {
      const region = makeRegion();
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.deleteSelectedRegion());
      expect(result.current.regions).toHaveLength(1);
    });
  });

  describe('resize', () => {
    it('startResize + updateResize + commitResize updates region', () => {
      const region = makeRegion({ id: 'r1', x: 10, y: 10, width: 30, height: 20 });
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.startResize('r1', 'se', 40, 30));
      act(() => result.current.updateResize(50, 40));
      act(() => result.current.commitResize());

      const updated = result.current.regions[0];
      expect(updated?.width).toBe(40); // 30 + 10
      expect(updated?.height).toBe(30); // 20 + 10
    });

    it('se handle extends bottom-right', () => {
      const region = makeRegion({ id: 'r1', x: 20, y: 20, width: 20, height: 20 });
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.startResize('r1', 'se', 40, 40));
      act(() => result.current.updateResize(50, 50));

      const updated = result.current.regions[0];
      expect(updated?.x).toBe(20);
      expect(updated?.y).toBe(20);
      expect(updated?.width).toBe(30);
      expect(updated?.height).toBe(30);
    });

    it('nw handle moves top-left', () => {
      const region = makeRegion({ id: 'r1', x: 20, y: 20, width: 20, height: 20 });
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.startResize('r1', 'nw', 20, 20));
      act(() => result.current.updateResize(10, 10));

      const updated = result.current.regions[0];
      expect(updated?.x).toBe(10);
      expect(updated?.y).toBe(10);
      expect(updated?.width).toBe(30);
      expect(updated?.height).toBe(30);
    });

    it('ne handle moves top-right', () => {
      const region = makeRegion({ id: 'r1', x: 10, y: 20, width: 20, height: 20 });
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.startResize('r1', 'ne', 30, 20));
      act(() => result.current.updateResize(40, 10));

      const updated = result.current.regions[0];
      expect(updated?.y).toBe(10);
      expect(updated?.width).toBe(30);
      expect(updated?.height).toBe(30);
    });

    it('sw handle moves bottom-left', () => {
      const region = makeRegion({ id: 'r1', x: 20, y: 10, width: 20, height: 20 });
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.startResize('r1', 'sw', 20, 30));
      act(() => result.current.updateResize(10, 40));

      const updated = result.current.regions[0];
      expect(updated?.x).toBe(10);
      expect(updated?.width).toBe(30);
      expect(updated?.height).toBe(30);
    });

    it('does nothing when region id not found', () => {
      const region = makeRegion({ id: 'r1' });
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.startResize('not-found', 'se', 0, 0));
      act(() => result.current.updateResize(10, 10));

      expect(result.current.regions[0]).toEqual(region);
    });
  });

  describe('updateBlurStrength', () => {
    it('updates blur strength for matching region', () => {
      const region = makeRegion({ id: 'r1', blurStrength: 20 });
      const { result } = renderHook(() => useRegionDraw([region]));

      act(() => result.current.updateBlurStrength('r1', 40));
      expect(result.current.regions[0]?.blurStrength).toBe(40);
    });

    it('does not affect other regions', () => {
      const r1 = makeRegion({ id: 'r1', blurStrength: 20 });
      const r2 = makeRegion({ id: 'r2', blurStrength: 20 });
      const { result } = renderHook(() => useRegionDraw([r1, r2]));

      act(() => result.current.updateBlurStrength('r1', 40));
      expect(result.current.regions[0]?.blurStrength).toBe(40);
      expect(result.current.regions[1]?.blurStrength).toBe(20);
    });
  });

  describe('setRegions', () => {
    it('replaces all regions', () => {
      const initial = makeRegion({ id: 'old' });
      const replacement = makeRegion({ id: 'new' });
      const { result } = renderHook(() => useRegionDraw([initial]));

      act(() => result.current.setRegions([replacement]));
      expect(result.current.regions).toEqual([replacement]);
    });
  });
});
