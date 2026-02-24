/**
 * Ground plane map grid.
 *
 * Reuses the same major/minor line treatment as the current map so early
 * web-next slices keep familiar spatial legibility.
 */

interface GroundPlaneProps {
  readonly width: number;
  readonly height: number;
}

const GRID_SPACING = 500;
const MINOR_SPACING = GRID_SPACING / 5;

export function GroundPlane({ width, height }: GroundPlaneProps) {
  // Core + glow layering keeps lines legible at scaled zoom levels where
  // single-pixel gradients can shimmer or disappear.
  const majorCoreColor = 'rgba(190, 220, 255, 0.22)';
  const majorGlowColor = 'rgba(120, 175, 255, 0.1)';
  const minorCoreColor = 'rgba(170, 200, 240, 0.08)';
  const minorGlowColor = 'rgba(120, 165, 235, 0.035)';
  const edgeColor = 'rgba(165, 190, 240, 0.34)';

  return (
    <div
      className="ground-plane"
      style={{
        width,
        height,
        backgroundImage: [
          `linear-gradient(${majorGlowColor} 10px, transparent 10px)`,
          `linear-gradient(90deg, ${majorGlowColor} 10px, transparent 10px)`,
          `linear-gradient(${majorCoreColor} 4px, transparent 4px)`,
          `linear-gradient(90deg, ${majorCoreColor} 4px, transparent 4px)`,
          `linear-gradient(${minorGlowColor} 6px, transparent 6px)`,
          `linear-gradient(90deg, ${minorGlowColor} 6px, transparent 6px)`,
          `linear-gradient(${minorCoreColor} 2px, transparent 2px)`,
          `linear-gradient(90deg, ${minorCoreColor} 2px, transparent 2px)`,
        ].join(', '),
        backgroundSize: [
          `${GRID_SPACING}px ${GRID_SPACING}px`,
          `${GRID_SPACING}px ${GRID_SPACING}px`,
          `${GRID_SPACING}px ${GRID_SPACING}px`,
          `${GRID_SPACING}px ${GRID_SPACING}px`,
          `${MINOR_SPACING}px ${MINOR_SPACING}px`,
          `${MINOR_SPACING}px ${MINOR_SPACING}px`,
          `${MINOR_SPACING}px ${MINOR_SPACING}px`,
          `${MINOR_SPACING}px ${MINOR_SPACING}px`,
        ].join(', '),
        border: 'none',
        boxShadow: `inset 0 0 0 6px ${edgeColor}, 0 0 42px rgba(100, 165, 255, 0.12)`,
      }}
    />
  );
}
