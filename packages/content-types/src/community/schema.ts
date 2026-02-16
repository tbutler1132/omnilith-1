/**
 * Community content type — schema for community organisms.
 *
 * A community is an organism that contains a spatial map as a composed
 * child. The mapOrganismId references that child directly, avoiding
 * runtime discovery. The organism's name field serves as the community name.
 */

import type { OrganismId } from '@omnilith/kernel';

export interface CommunityPayload {
  readonly description: string;
  readonly mapOrganismId: OrganismId;
}
