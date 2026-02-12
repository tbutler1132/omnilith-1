/**
 * QueryPort — cross-cutting retrieval across organisms, states, and composition.
 *
 * This is the one infrastructure concern expected to grow as the API
 * and rendering layers reveal what's needed. The other seven concerns
 * should remain stable.
 */

import type { ContentTypeId, OrganismId, Timestamp, UserId } from '../identity.js';
import type { Organism } from '../organism/organism.js';
import type { OrganismState } from '../organism/organism-state.js';
import type { Proposal } from '../proposals/proposal.js';

export interface OrganismWithState {
  readonly organism: Organism;
  readonly currentState: OrganismState | undefined;
}

export interface VitalityData {
  readonly organismId: OrganismId;
  readonly recentStateChanges: number;
  readonly openProposalCount: number;
  readonly lastActivityAt?: Timestamp;
}

export interface QueryFilters {
  readonly contentTypeId?: ContentTypeId;
  readonly createdBy?: UserId;
  readonly parentId?: OrganismId;
  readonly limit?: number;
  readonly offset?: number;
}

export interface QueryPort {
  findOrganismsWithState(filters: QueryFilters): Promise<ReadonlyArray<OrganismWithState>>;
  getVitality(organismId: OrganismId): Promise<VitalityData>;
  findOrganismsByUser(userId: UserId): Promise<ReadonlyArray<OrganismWithState>>;
  findProposalsByUser(userId: UserId): Promise<ReadonlyArray<Proposal>>;
}
