/**
 * GroundPlane — CSS grid background rendered in world space behind organisms.
 *
 * Uses CSS background-image gradients for the grid — GPU-composited,
 * no flashing or subpixel artifacts during pan/zoom animation.
 * Opacity responds to altitude: prominent at High, subtle at Close.
 * Pointer events are disabled so it never interferes with pan/click.
 */

import type { Altitude } from '../contracts/altitude.js';

interface GroundPlaneProps {
  width: number;
  height: number;
  altitude: Altitude;
}

const GRID_SPACING = 500;
const MINOR_SPACING = GRID_SPACING / 5;

const GRID_OPACITY: Record<Altitude, number> = {
  high: 0.08,
  mid: 0.05,
  close: 0.03,
};

const MINOR_OPACITY: Record<Altitude, number> = {
  high: 0.03,
  mid: 0.02,
  close: 0,
};

const EDGE_OPACITY: Record<Altitude, number> = {
  high: 0.2,
  mid: 0.12,
  close: 0.06,
};

export function GroundPlane({ width, height, altitude }: GroundPlaneProps) {
  const majorColor = `rgba(255, 255, 255, ${GRID_OPACITY[altitude]})`;
  const minorColor = `rgba(255, 255, 255, ${MINOR_OPACITY[altitude]})`;
  const edgeColor = `rgba(255, 255, 255, ${EDGE_OPACITY[altitude]})`;

  const backgroundImage =
    MINOR_OPACITY[altitude] > 0
      ? [
          `linear-gradient(${majorColor} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${majorColor} 1px, transparent 1px)`,
          `linear-gradient(${minorColor} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${minorColor} 1px, transparent 1px)`,
        ].join(', ')
      : [
          `linear-gradient(${majorColor} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${majorColor} 1px, transparent 1px)`,
        ].join(', ');

  const backgroundSize =
    MINOR_OPACITY[altitude] > 0
      ? [
          `${GRID_SPACING}px ${GRID_SPACING}px`,
          `${GRID_SPACING}px ${GRID_SPACING}px`,
          `${MINOR_SPACING}px ${MINOR_SPACING}px`,
          `${MINOR_SPACING}px ${MINOR_SPACING}px`,
        ].join(', ')
      : [`${GRID_SPACING}px ${GRID_SPACING}px`, `${GRID_SPACING}px ${GRID_SPACING}px`].join(', ');

  return (
    <div
      className="ground-plane"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        backgroundImage,
        backgroundSize,
        border: `1px solid ${edgeColor}`,
      }}
    />
  );
}
