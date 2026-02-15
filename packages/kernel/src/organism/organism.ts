/**
 * Organism — the single primitive of the platform.
 *
 * An organism is a bounded evolving identity with state and composition.
 * Identity has two faces: the machine-readable id and the human-readable
 * name, both set at the threshold when stewardship is assumed. The name
 * is part of identity — it endures through change, though it can be
 * deliberately renamed.
 *
 * Everything on the platform — creative works, communities, governance
 * policies, maps — is an organism.
 */

import type { OrganismId, Timestamp, UserId } from '../identity.js';

export interface Organism {
  readonly id: OrganismId;
  readonly name: string;
  readonly createdAt: Timestamp;
  readonly createdBy: UserId;
  readonly openTrunk: boolean;
  readonly forkedFromId?: OrganismId;
}
