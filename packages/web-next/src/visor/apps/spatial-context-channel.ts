/**
 * Spatial context channel.
 *
 * Keeps one current spatial context snapshot and lets visor apps subscribe
 * to changes through a small in-memory publish/subscribe boundary.
 */

import type { SpatialContextChangedListener, VisorAppSpatialContext } from './spatial-context-contract.js';

export interface SpatialContextChannel {
  readonly getSnapshot: () => VisorAppSpatialContext;
  readonly publish: (next: VisorAppSpatialContext) => void;
  readonly subscribe: (listener: SpatialContextChangedListener) => () => void;
}

export function createSpatialContextChannel(initial: VisorAppSpatialContext): SpatialContextChannel {
  let snapshot = initial;
  const listeners = new Set<SpatialContextChangedListener>();

  return {
    getSnapshot: () => snapshot,
    publish: (next) => {
      snapshot = next;
      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
