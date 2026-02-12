/**
 * Organism — the single primitive of the platform.
 *
 * An organism is a bounded evolving identity with state and composition.
 * It has exactly three properties: identity (persistent reference),
 * state (immutable snapshots with history), and composition (can contain
 * and be contained by other organisms).
 *
 * Everything on the platform — creative works, communities, governance
 * policies, maps — is an organism.
 */

import type { OrganismId, Timestamp, UserId } from '../identity.js';

export interface Organism {
  readonly id: OrganismId;
  readonly createdAt: Timestamp;
  readonly createdBy: UserId;
  readonly openTrunk: boolean;
  readonly forkedFromId?: OrganismId;
}
