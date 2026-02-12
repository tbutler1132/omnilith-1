/**
 * openProposal — offer a new state for an organism.
 *
 * Validates the proposed payload against the content type, creates
 * a proposal with 'open' status, and emits an event.
 */

import type {
  OrganismId,
  ContentTypeId,
  UserId,
  IdentityGenerator,
} from '../identity.js';
import type { ContentTypeRegistry } from '../content-types/content-type-registry.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { OrganismRepository } from '../organism/organism-repository.js';
import type { ProposalRepository } from './proposal-repository.js';
import type { Proposal } from './proposal.js';
import type { DomainEvent } from '../events/event.js';
import {
  OrganismNotFoundError,
  ContentTypeNotRegisteredError,
  ValidationFailedError,
} from '../errors.js';

export interface OpenProposalInput {
  readonly organismId: OrganismId;
  readonly proposedContentTypeId: ContentTypeId;
  readonly proposedPayload: unknown;
  readonly proposedBy: UserId;
}

export interface OpenProposalDeps {
  readonly organismRepository: OrganismRepository;
  readonly proposalRepository: ProposalRepository;
  readonly contentTypeRegistry: ContentTypeRegistry;
  readonly eventPublisher: EventPublisher;
  readonly identityGenerator: IdentityGenerator;
}

export async function openProposal(
  input: OpenProposalInput,
  deps: OpenProposalDeps,
): Promise<Proposal> {
  const organism = await deps.organismRepository.findById(input.organismId);
  if (!organism) {
    throw new OrganismNotFoundError(input.organismId);
  }

  const contract = deps.contentTypeRegistry.get(input.proposedContentTypeId);
  if (!contract) {
    throw new ContentTypeNotRegisteredError(input.proposedContentTypeId);
  }

  const validation = contract.validate(input.proposedPayload);
  if (!validation.valid) {
    throw new ValidationFailedError(input.proposedContentTypeId, validation.issues);
  }

  const now = deps.identityGenerator.timestamp();

  const proposal: Proposal = {
    id: deps.identityGenerator.proposalId(),
    organismId: input.organismId,
    proposedContentTypeId: input.proposedContentTypeId,
    proposedPayload: input.proposedPayload,
    proposedBy: input.proposedBy,
    status: 'open',
    createdAt: now,
  };

  await deps.proposalRepository.save(proposal);

  const event: DomainEvent = {
    id: deps.identityGenerator.eventId(),
    type: 'proposal.opened',
    organismId: input.organismId,
    actorId: input.proposedBy,
    occurredAt: now,
    payload: {
      proposalId: proposal.id,
      proposedContentTypeId: input.proposedContentTypeId,
    },
  };
  await deps.eventPublisher.publish(event);

  return proposal;
}
