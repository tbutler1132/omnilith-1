/**
 * High-altitude secondary-grid contract for Space.
 *
 * Centralizes high-altitude subdivision and marker fill constants so
 * grid geometry and marker sizing stay visually synchronized.
 */

export const HIGH_ALTITUDE_SECONDARY_SUBDIVISIONS_X = 4;
export const HIGH_ALTITUDE_SECONDARY_SUBDIVISIONS_Y = 2;
export const HIGH_ALTITUDE_MARKER_FILL_RATIO = 0.78;

const FALLBACK_GRID_SPACING = 180;

export function resolveHighAltitudeSecondaryCellSize(gridSpacing: number): number {
  const normalizedGridSpacing = Number.isFinite(gridSpacing) && gridSpacing > 0 ? gridSpacing : FALLBACK_GRID_SPACING;
  const cellWidth = normalizedGridSpacing / HIGH_ALTITUDE_SECONDARY_SUBDIVISIONS_X;
  const cellHeight = normalizedGridSpacing / HIGH_ALTITUDE_SECONDARY_SUBDIVISIONS_Y;
  return Math.min(cellWidth, cellHeight);
}
