/**
 * Space ambient layer registry — ordered registration for canonical Space overlays.
 *
 * Keeps ambient layer composition deterministic so additional world conditions
 * can be introduced without changing the Space root renderer.
 */

import type { SpaceAmbientLayerDefinition } from './space-ambient-layer-contract.js';

const spaceAmbientLayerRegistry: SpaceAmbientLayerDefinition[] = [];

export function registerSpaceAmbientLayer(layer: SpaceAmbientLayerDefinition): void {
  const existingIndex = spaceAmbientLayerRegistry.findIndex((entry) => entry.id === layer.id);
  if (existingIndex >= 0) {
    spaceAmbientLayerRegistry.splice(existingIndex, 1, layer);
    return;
  }

  spaceAmbientLayerRegistry.push(layer);
}

export function listSpaceAmbientLayers(): SpaceAmbientLayerDefinition[] {
  return [...spaceAmbientLayerRegistry].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
