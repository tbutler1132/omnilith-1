/**
 * Organism wireframe preview.
 *
 * Renders a lightweight SVG wireframe panel keyed by current content type
 * so the Organism app has an at-a-glance spatial signature without loading
 * a heavy 3D runtime.
 */

import type { CSSProperties } from 'react';
import { resolveWireframeModelSpec } from './wireframe-model-spec.js';

interface OrganismWireframePreviewProps {
  readonly contentTypeId: string | null;
}

export function OrganismWireframePreview({ contentTypeId }: OrganismWireframePreviewProps) {
  const spec = resolveWireframeModelSpec(contentTypeId);
  const accentColor = toHexColor(spec.colorHex);
  const rotationDurationSeconds = resolveRotationDurationSeconds(spec.rotationSpeedY);
  const panelStyle = {
    '--organism-wireframe-accent': accentColor,
    '--organism-wireframe-duration': `${rotationDurationSeconds.toFixed(2)}s`,
  } as CSSProperties;

  return (
    <div className="organism-wireframe-panel" style={panelStyle} aria-hidden="true">
      <svg viewBox="0 0 128 128" className="organism-wireframe-svg" focusable="false" role="presentation">
        <g className="organism-wireframe-rotor">
          {spec.geometryKind === 'icosahedron' ? (
            <>
              <polygon
                className="organism-wireframe-line organism-wireframe-line--strong"
                points="64,10 24,34 24,94 64,118 104,94 104,34"
              />
              <polyline className="organism-wireframe-line" points="64,10 64,118" />
              <polyline className="organism-wireframe-line" points="24,34 64,56 104,34" />
              <polyline className="organism-wireframe-line" points="24,94 64,72 104,94" />
              <line className="organism-wireframe-line" x1="24" y1="34" x2="104" y2="94" />
              <line className="organism-wireframe-line" x1="104" y1="34" x2="24" y2="94" />
            </>
          ) : (
            <>
              <rect
                className="organism-wireframe-line organism-wireframe-line--strong"
                x="24"
                y="28"
                width="58"
                height="58"
              />
              <rect className="organism-wireframe-line" x="44" y="42" width="58" height="58" />
              <line className="organism-wireframe-line" x1="24" y1="28" x2="44" y2="42" />
              <line className="organism-wireframe-line" x1="82" y1="28" x2="102" y2="42" />
              <line className="organism-wireframe-line" x1="24" y1="86" x2="44" y2="100" />
              <line className="organism-wireframe-line" x1="82" y1="86" x2="102" y2="100" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

function toHexColor(colorHex: number): string {
  return `#${colorHex.toString(16).padStart(6, '0')}`;
}

function resolveRotationDurationSeconds(rotationSpeedY: number): number {
  const speed = Math.max(rotationSpeedY, 0.0001);
  const duration = (0.002 / speed) * 18;
  return Math.max(12, Math.min(duration, 28));
}
