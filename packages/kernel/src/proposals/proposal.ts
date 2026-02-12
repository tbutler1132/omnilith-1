/**
 * Proposal — an offered new state for an organism.
 *
 * Proposals are the central interaction between people and organisms.
 * When a proposal arrives, the infrastructure checks for policy organisms
 * inside the target organism and lets them evaluate. The result is
 * integration (state advances) or decline (state remains).
 *
 * Proposals work identically whether the source is an internal
 * contributor or a cross-boundary fork.
 */

import type {
  ProposalId,
  OrganismId,
  ContentTypeId,
  UserId,
  Timestamp,
} from '../identity.js';

export type ProposalStatus = 'open' | 'integrated' | 'declined';

export interface Proposal {
  readonly id: ProposalId;
  readonly organismId: OrganismId;
  readonly proposedContentTypeId: ContentTypeId;
  readonly proposedPayload: unknown;
  readonly proposedBy: UserId;
  readonly status: ProposalStatus;
  readonly createdAt: Timestamp;
  readonly resolvedAt?: Timestamp;
  readonly resolvedBy?: UserId;
  readonly declineReason?: string;
}
