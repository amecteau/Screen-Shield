import { z } from 'zod';

/**
 * Zod schema for BlurRegion validation.
 *
 * This schema serves as both a runtime validator and a living documentation
 * of the data contract. All region data entering the system via IPC must
 * pass through this schema before persistence.
 */
export const BlurRegionSchema = z.object({
  id: z.string().uuid(),
  x: z.number().min(0).max(100).finite(),
  y: z.number().min(0).max(100).finite(),
  width: z.number().gt(0).max(100).finite(),
  height: z.number().gt(0).max(100).finite(),
  blurStrength: z.number().gt(0).finite().default(20),
}).refine(
  (region) => region.x + region.width <= 100,
  { message: 'Region extends beyond right edge of screen' },
).refine(
  (region) => region.y + region.height <= 100,
  { message: 'Region extends beyond bottom edge of screen' },
);

/**
 * Zod schema for BlurProfile validation.
 */
export const BlurProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).trim(),
  regions: z.array(BlurRegionSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Schema for validating a profile save request from the renderer.
 * Allows partial updates — id is required, everything else optional.
 */
export const ProfileSaveRequestSchema = BlurProfileSchema;

/**
 * Schema for validating a simple ID parameter.
 */
export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for setting the active profile (nullable — null means disable all).
 */
export const SetActiveProfileSchema = z.object({
  id: z.string().uuid().nullable(),
});

export type BlurRegionInput = z.input<typeof BlurRegionSchema>;
export type BlurProfileInput = z.input<typeof BlurProfileSchema>;
