/**
 * QueryPort — cross-cutting retrieval across organisms, states, and composition.
 *
 * This is the one infrastructure concern expected to grow as the API
 * and rendering layers reveal what's needed. The other seven concerns
 * should remain stable.
 */

import type { EventType } from '../events/event.js';
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
  /** State changes in the trailing vitality window (currently 30 days). */
  readonly recentStateChanges: number;
  readonly openProposalCount: number;
  /** Most recent state/proposal/event activity timestamp. */
  readonly lastActivityAt?: Timestamp;
}

export interface OrganismContributor {
  readonly userId: UserId;
  readonly stateCount: number;
  readonly proposalCount: number;
  readonly integrationCount: number;
  readonly declineCount: number;
  readonly eventCount: number;
  readonly eventTypeCounts: Readonly<Partial<Record<EventType, number>>>;
  readonly lastContributedAt?: Timestamp;
}

export interface OrganismContributions {
  readonly organismId: OrganismId;
  readonly contributors: ReadonlyArray<OrganismContributor>;
}

export interface QueryFilters {
  readonly contentTypeId?: ContentTypeId;
  readonly createdBy?: UserId;
  readonly parentId?: OrganismId;
  readonly nameQuery?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface QueryPort {
  findOrganismsWithState(filters: QueryFilters): Promise<ReadonlyArray<OrganismWithState>>;
  getVitality(organismId: OrganismId): Promise<VitalityData>;
  getOrganismContributions(organismId: OrganismId): Promise<OrganismContributions>;
  findOrganismsByUser(userId: UserId): Promise<ReadonlyArray<OrganismWithState>>;
  findProposalsByUser(userId: UserId): Promise<ReadonlyArray<Proposal>>;
}
