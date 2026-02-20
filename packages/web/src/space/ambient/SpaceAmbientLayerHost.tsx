/**
 * SpaceAmbientLayerHost — renders registered canonical ambient Space layers.
 *
 * This host is intentionally passive: it only gathers context and renders
 * registered layers in deterministic order.
 */

import type { SpaceAmbientLayerContext } from './space-ambient-layer-contract.js';
import { listSpaceAmbientLayers } from './space-ambient-layer-registry.js';

interface SpaceAmbientLayerHostProps {
  context: SpaceAmbientLayerContext;
}

export function SpaceAmbientLayerHost({ context }: SpaceAmbientLayerHostProps) {
  const layers = listSpaceAmbientLayers();
  if (layers.length === 0) return null;

  return (
    <>
      {layers.map((layer) => (
        <div key={layer.id} className="space-ambient-layer" data-space-ambient-layer={layer.id}>
          {layer.render(context)}
        </div>
      ))}
    </>
  );
}
