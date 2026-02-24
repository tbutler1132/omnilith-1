/**
 * SurfaceRepository — outbound port for surfaced organism lookups.
 *
 * Access control and map sizing both need a canonical answer to:
 * "is this organism surfaced on any spatial map right now?"
 */

import type { OrganismId } from '../identity.js';

export interface SurfaceRepository {
  isSurfaced(organismId: OrganismId): Promise<boolean>;
  listSurfacedOrganismIds(): Promise<ReadonlySet<OrganismId>>;
}
