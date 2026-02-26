/**
 * Grid spacing policy for spatial map surfaces.
 *
 * Keeps map-cell density consistent across differently sized maps while
 * preserving the neon grid style constraints.
 */

export const GRID_SPACING_MAX = 700;
export const GRID_SPACING_MIN = 180;
export const TARGET_GRID_CELLS = 7;

export function resolveGridSpacing(width: number, height: number): number {
  const limitingDimension = Math.max(1, Math.min(width, height));
  const idealSpacing = limitingDimension / TARGET_GRID_CELLS;
  return Math.max(GRID_SPACING_MIN, Math.min(GRID_SPACING_MAX, idealSpacing));
}
