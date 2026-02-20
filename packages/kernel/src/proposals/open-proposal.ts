/**
 * openProposal — offer a new state for an organism.
 *
 * Validates the proposed payload against the content type, creates
 * a proposal with 'open' status, and emits an event.
 */

import type { CompositionRepository } from '../composition/composition-repository.js';
import type { ContentTypeRegistry } from '../content-types/content-type-registry.js';
import {
  AccessDeniedError,
  ContentTypeNotRegisteredError,
  OrganismNotFoundError,
  ValidationFailedError,
} from '../errors.js';
import type { DomainEvent } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { ContentTypeId, IdentityGenerator, OrganismId, UserId } from '../identity.js';
import type { OrganismRepository } from '../organism/organism-repository.js';
import type { StateRepository } from '../organism/state-repository.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';
import { checkAccess } from '../visibility/access-control.js';
import type { VisibilityLevel } from '../visibility/visibility.js';
import type { VisibilityRepository } from '../visibility/visibility-repository.js';
import type { Proposal, ProposalMutation } from './proposal.js';
import { toLegacyProposalFields } from './proposal.js';
import type { ProposalRepository } from './proposal-repository.js';

interface OpenLegacyStateProposalInput {
  readonly organismId: OrganismId;
  readonly proposedContentTypeId: ContentTypeId;
  readonly proposedPayload: unknown;
  readonly description?: string;
  readonly proposedBy: UserId;
}

interface OpenMutationProposalInput {
  readonly organismId: OrganismId;
  readonly mutation: ProposalMutation;
  readonly description?: string;
  readonly proposedBy: UserId;
}

export type OpenProposalInput = OpenLegacyStateProposalInput | OpenMutationProposalInput;

export interface OpenProposalDeps {
  readonly organismRepository: OrganismRepository;
  readonly stateRepository: StateRepository;
  readonly proposalRepository: ProposalRepository;
  readonly contentTypeRegistry: ContentTypeRegistry;
  readonly eventPublisher: EventPublisher;
  readonly identityGenerator: IdentityGenerator;
  readonly visibilityRepository: VisibilityRepository;
  readonly relationshipRepository: RelationshipRepository;
  readonly compositionRepository: CompositionRepository;
}

export async function openProposal(input: OpenProposalInput, deps: OpenProposalDeps): Promise<Proposal> {
  const organism = await deps.organismRepository.findById(input.organismId);
  if (!organism) {
    throw new OrganismNotFoundError(input.organismId);
  }

  const accessDecision = await checkAccess(input.proposedBy, input.organismId, 'open-proposal', {
    visibilityRepository: deps.visibilityRepository,
    relationshipRepository: deps.relationshipRepository,
    compositionRepository: deps.compositionRepository,
    organismRepository: deps.organismRepository,
  });

  if (!accessDecision.allowed) {
    throw new AccessDeniedError(input.proposedBy, 'open-proposal', input.organismId);
  }

  const mutation = normalizeProposalMutation(input);
  await validateMutationForOpen(input.organismId, mutation, deps);

  const now = deps.identityGenerator.timestamp();
  const legacyFields = toLegacyProposalFields(mutation);

  const proposal: Proposal = {
    id: deps.identityGenerator.proposalId(),
    organismId: input.organismId,
    mutation,
    proposedContentTypeId: legacyFields.proposedContentTypeId,
    proposedPayload: legacyFields.proposedPayload,
    description: input.description,
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
      mutationKind: proposal.mutation.kind,
      proposedContentTypeId: proposal.proposedContentTypeId,
    },
  };
  await deps.eventPublisher.publish(event);

  return proposal;
}

function normalizeProposalMutation(input: OpenProposalInput): ProposalMutation {
  if ('mutation' in input) {
    return input.mutation;
  }

  return {
    kind: 'append-state',
    contentTypeId: input.proposedContentTypeId,
    payload: input.proposedPayload,
  };
}

async function validateMutationForOpen(
  organismId: OrganismId,
  mutation: ProposalMutation,
  deps: Pick<OpenProposalDeps, 'contentTypeRegistry' | 'stateRepository' | 'organismRepository'>,
): Promise<void> {
  switch (mutation.kind) {
    case 'append-state': {
      const contract = deps.contentTypeRegistry.get(mutation.contentTypeId);
      if (!contract) {
        throw new ContentTypeNotRegisteredError(mutation.contentTypeId);
      }

      const currentState = await deps.stateRepository.findCurrentByOrganismId(organismId);
      const validation = contract.validate(mutation.payload, { previousPayload: currentState?.payload });
      if (!validation.valid) {
        throw new ValidationFailedError(mutation.contentTypeId, validation.issues);
      }
      return;
    }

    case 'compose':
    case 'decompose': {
      const childExists = await deps.organismRepository.exists(mutation.childId);
      if (!childExists) {
        throw new OrganismNotFoundError(mutation.childId);
      }
      return;
    }

    case 'change-visibility': {
      if (!isVisibilityLevel(mutation.level)) {
        throw new ValidationFailedError('visibility', ['level must be public, members, or private']);
      }
      return;
    }
  }
}

function isVisibilityLevel(level: string): level is VisibilityLevel {
  return level === 'public' || level === 'members' || level === 'private';
}
