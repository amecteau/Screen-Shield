import { describe, it, expect } from 'vitest';
import {
  clamp,
  isValidPercentage,
  isValidRegion,
  regionToPixels,
  pixelsToRegion,
  regionsOverlap,
} from './geometry.js';
import type { BlurRegion } from '../types/index.js';

function makeRegion(overrides: Partial<BlurRegion> = {}): BlurRegion {
  return {
    id: 'test-region-1',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    blurStrength: 20,
    ...overrides,
  };
}

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min when below', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max when above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles equal min and max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });
});

describe('isValidPercentage', () => {
  it('accepts valid percentages', () => {
    expect(isValidPercentage(0)).toBe(true);
    expect(isValidPercentage(50)).toBe(true);
    expect(isValidPercentage(100)).toBe(true);
  });

  it('rejects out-of-range values', () => {
    expect(isValidPercentage(-1)).toBe(false);
    expect(isValidPercentage(101)).toBe(false);
  });

  it('rejects non-finite values', () => {
    expect(isValidPercentage(NaN)).toBe(false);
    expect(isValidPercentage(Infinity)).toBe(false);
    expect(isValidPercentage(-Infinity)).toBe(false);
  });

  it('rejects non-number types', () => {
    expect(isValidPercentage('50')).toBe(false);
    expect(isValidPercentage(null)).toBe(false);
    expect(isValidPercentage(undefined)).toBe(false);
  });
});

describe('isValidRegion', () => {
  it('accepts a valid region', () => {
    expect(isValidRegion(makeRegion())).toBe(true);
  });

  it('rejects zero width', () => {
    expect(isValidRegion(makeRegion({ width: 0 }))).toBe(false);
  });

  it('rejects zero height', () => {
    expect(isValidRegion(makeRegion({ height: 0 }))).toBe(false);
  });

  it('rejects region extending beyond screen bounds', () => {
    expect(isValidRegion(makeRegion({ x: 80, width: 30 }))).toBe(false);
    expect(isValidRegion(makeRegion({ y: 70, height: 40 }))).toBe(false);
  });

  it('rejects negative blurStrength', () => {
    expect(isValidRegion(makeRegion({ blurStrength: -5 }))).toBe(false);
  });

  it('rejects NaN coordinates', () => {
    expect(isValidRegion(makeRegion({ x: NaN }))).toBe(false);
  });
});

describe('regionToPixels', () => {
  it('converts percentages to pixels correctly', () => {
    const region = makeRegion({ x: 10, y: 20, width: 50, height: 25 });
    const result = regionToPixels(region, 1920, 1080);

    expect(result.x).toBe(192);
    expect(result.y).toBe(216);
    expect(result.width).toBe(960);
    expect(result.height).toBe(270);
  });

  it('handles full-screen region', () => {
    const region = makeRegion({ x: 0, y: 0, width: 100, height: 100 });
    const result = regionToPixels(region, 1920, 1080);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });
});

describe('pixelsToRegion', () => {
  it('converts pixels to percentages correctly', () => {
    const result = pixelsToRegion(
      { x: 192, y: 216, width: 960, height: 270 },
      1920,
      1080,
    );

    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
    expect(result.width).toBe(50);
    expect(result.height).toBe(25);
  });

  it('clamps values exceeding screen bounds', () => {
    const result = pixelsToRegion(
      { x: -100, y: -50, width: 3000, height: 2000 },
      1920,
      1080,
    );

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });
});

describe('regionsOverlap', () => {
  it('detects overlapping regions', () => {
    const a = makeRegion({ x: 10, y: 10, width: 30, height: 30 });
    const b = makeRegion({ x: 20, y: 20, width: 30, height: 30 });
    expect(regionsOverlap(a, b)).toBe(true);
  });

  it('detects non-overlapping regions (side by side)', () => {
    const a = makeRegion({ x: 0, y: 0, width: 20, height: 20 });
    const b = makeRegion({ x: 20, y: 0, width: 20, height: 20 });
    expect(regionsOverlap(a, b)).toBe(false);
  });

  it('detects non-overlapping regions (stacked)', () => {
    const a = makeRegion({ x: 0, y: 0, width: 50, height: 20 });
    const b = makeRegion({ x: 0, y: 20, width: 50, height: 20 });
    expect(regionsOverlap(a, b)).toBe(false);
  });

  it('detects containment as overlap', () => {
    const a = makeRegion({ x: 0, y: 0, width: 100, height: 100 });
    const b = makeRegion({ x: 25, y: 25, width: 50, height: 50 });
    expect(regionsOverlap(a, b)).toBe(true);
  });
});
