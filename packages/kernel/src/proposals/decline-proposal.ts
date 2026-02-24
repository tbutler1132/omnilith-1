/**
 * declineProposal — reject a proposal. The organism's state remains.
 */

import type { CompositionRepository } from '../composition/composition-repository.js';
import { AccessDeniedError, ProposalAlreadyResolvedError, ProposalNotFoundError } from '../errors.js';
import type { DomainEvent } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { IdentityGenerator, ProposalId, UserId } from '../identity.js';
import type { OrganismRepository } from '../organism/organism-repository.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';
import { checkAccess } from '../visibility/access-control.js';
import type { SurfaceRepository } from '../visibility/surface-repository.js';
import type { VisibilityRepository } from '../visibility/visibility-repository.js';
import type { Proposal } from './proposal.js';
import type { ProposalRepository } from './proposal-repository.js';

export interface DeclineProposalInput {
  readonly proposalId: ProposalId;
  readonly declinedBy: UserId;
  readonly reason?: string;
}

export interface DeclineProposalDeps {
  readonly proposalRepository: ProposalRepository;
  readonly organismRepository: OrganismRepository;
  readonly compositionRepository: CompositionRepository;
  readonly eventPublisher: EventPublisher;
  readonly relationshipRepository: RelationshipRepository;
  readonly visibilityRepository: VisibilityRepository;
  readonly surfaceRepository?: SurfaceRepository;
  readonly identityGenerator: IdentityGenerator;
}

export async function declineProposal(input: DeclineProposalInput, deps: DeclineProposalDeps): Promise<Proposal> {
  const proposal = await deps.proposalRepository.findById(input.proposalId);
  if (!proposal) {
    throw new ProposalNotFoundError(input.proposalId);
  }

  if (proposal.status !== 'open') {
    throw new ProposalAlreadyResolvedError(input.proposalId, proposal.status);
  }

  const accessDecision = await checkAccess(input.declinedBy, proposal.organismId, 'decline-proposal', {
    visibilityRepository: deps.visibilityRepository,
    surfaceRepository: deps.surfaceRepository,
    relationshipRepository: deps.relationshipRepository,
    compositionRepository: deps.compositionRepository,
    organismRepository: deps.organismRepository,
  });

  if (!accessDecision.allowed) {
    throw new AccessDeniedError(input.declinedBy, 'decline-proposal', proposal.organismId);
  }

  const now = deps.identityGenerator.timestamp();

  const declinedProposal: Proposal = {
    ...proposal,
    status: 'declined',
    resolvedAt: now,
    resolvedBy: input.declinedBy,
    declineReason: input.reason,
  };

  const updated = await deps.proposalRepository.update(declinedProposal);
  if (!updated) {
    throw new ProposalAlreadyResolvedError(input.proposalId, 'declined');
  }

  const event: DomainEvent = {
    id: deps.identityGenerator.eventId(),
    type: 'proposal.declined',
    organismId: proposal.organismId,
    actorId: input.declinedBy,
    occurredAt: now,
    payload: {
      proposalId: proposal.id,
      reason: input.reason,
    },
  };
  await deps.eventPublisher.publish(event);

  return declinedProposal;
}
