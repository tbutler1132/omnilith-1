/**
 * Spatial map content type — a curated spatial arrangement of organisms.
 *
 * Maps are organisms with this content type. Surfacing an organism
 * means editing the map organism to include it with coordinates.
 */

import type { OrganismId } from '@omnilith/kernel';

export interface SpatialMapPayload {
  readonly entries: ReadonlyArray<SpatialMapEntry>;
  readonly width: number;
  readonly height: number;
  readonly minSeparation?: number;
}

export interface SpatialMapEntry {
  readonly organismId: OrganismId;
  readonly x: number;
  readonly y: number;
  readonly size?: number;
  readonly emphasis?: number;
  readonly curationScale?: number;
}
