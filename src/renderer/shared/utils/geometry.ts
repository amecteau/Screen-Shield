import type { BlurRegion } from '../types/index.js';

/**
 * Clamp a value between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Validate that a number is finite and within percentage bounds (0–100).
 */
export function isValidPercentage(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

/**
 * Validate all coordinate fields of a BlurRegion.
 * Returns true only if all percentage fields are valid and blurStrength is positive finite.
 */
export function isValidRegion(region: BlurRegion): boolean {
  return (
    isValidPercentage(region.x) &&
    isValidPercentage(region.y) &&
    isValidPercentage(region.width) &&
    isValidPercentage(region.height) &&
    region.width > 0 &&
    region.height > 0 &&
    region.x + region.width <= 100 &&
    region.y + region.height <= 100 &&
    typeof region.blurStrength === 'number' &&
    Number.isFinite(region.blurStrength) &&
    region.blurStrength > 0
  );
}

/**
 * Convert percentage-based region to pixel coordinates for a given screen size.
 */
export function regionToPixels(
  region: BlurRegion,
  screenWidth: number,
  screenHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round((region.x / 100) * screenWidth),
    y: Math.round((region.y / 100) * screenHeight),
    width: Math.round((region.width / 100) * screenWidth),
    height: Math.round((region.height / 100) * screenHeight),
  };
}

/**
 * Convert pixel coordinates to percentage-based region.
 */
export function pixelsToRegion(
  px: { x: number; y: number; width: number; height: number },
  screenWidth: number,
  screenHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: clamp((px.x / screenWidth) * 100, 0, 100),
    y: clamp((px.y / screenHeight) * 100, 0, 100),
    width: clamp((px.width / screenWidth) * 100, 0, 100),
    height: clamp((px.height / screenHeight) * 100, 0, 100),
  };
}

/**
 * Check if two regions overlap.
 */
export function regionsOverlap(a: BlurRegion, b: BlurRegion): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}
