/**
 * integrateProposal — accept a proposal and advance the organism's state.
 *
 * Checks integration authority, evaluates the proposal against policy
 * organisms, advances the organism's state, and marks the proposal
 * as integrated.
 */

import { composeOrganism } from '../composition/compose-organism.js';
import type { CompositionRepository } from '../composition/composition-repository.js';
import { decomposeOrganism } from '../composition/decompose-organism.js';
import type { ContentTypeRegistry } from '../content-types/content-type-registry.js';
import {
  AccessDeniedError,
  ContentTypeNotRegisteredError,
  ProposalAlreadyResolvedError,
  ProposalNotFoundError,
  ValidationFailedError,
} from '../errors.js';
import type { DomainEvent } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { IdentityGenerator, ProposalId, UserId } from '../identity.js';
import type { OrganismRepository } from '../organism/organism-repository.js';
import type { OrganismState } from '../organism/organism-state.js';
import type { StateRepository } from '../organism/state-repository.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';
import { checkAccess } from '../visibility/access-control.js';
import { changeVisibility } from '../visibility/change-visibility.js';
import type { SurfaceRepository } from '../visibility/surface-repository.js';
import type { VisibilityRepository } from '../visibility/visibility-repository.js';
import { evaluateProposal } from './evaluate-proposal.js';
import type { Proposal } from './proposal.js';
import type { ProposalRepository } from './proposal-repository.js';

export interface IntegrateProposalInput {
  readonly proposalId: ProposalId;
  readonly integratedBy: UserId;
}

export interface IntegrateProposalDeps {
  readonly proposalRepository: ProposalRepository;
  readonly organismRepository: OrganismRepository;
  readonly stateRepository: StateRepository;
  readonly contentTypeRegistry: ContentTypeRegistry;
  readonly compositionRepository: CompositionRepository;
  readonly eventPublisher: EventPublisher;
  readonly relationshipRepository: RelationshipRepository;
  readonly visibilityRepository: VisibilityRepository;
  readonly surfaceRepository?: SurfaceRepository;
  readonly identityGenerator: IdentityGenerator;
}

export type IntegrateProposalResult =
  | { readonly outcome: 'integrated'; readonly proposal: Proposal; readonly newState?: OrganismState }
  | { readonly outcome: 'policy-declined'; readonly proposal: Proposal };

export async function integrateProposal(
  input: IntegrateProposalInput,
  deps: IntegrateProposalDeps,
): Promise<IntegrateProposalResult> {
  const proposal = await deps.proposalRepository.findById(input.proposalId);
  if (!proposal) {
    throw new ProposalNotFoundError(input.proposalId);
  }

  if (proposal.status !== 'open') {
    throw new ProposalAlreadyResolvedError(input.proposalId, proposal.status);
  }

  // Check integration authority
  const accessDecision = await checkAccess(input.integratedBy, proposal.organismId, 'integrate-proposal', {
    visibilityRepository: deps.visibilityRepository,
    surfaceRepository: deps.surfaceRepository,
    relationshipRepository: deps.relationshipRepository,
    compositionRepository: deps.compositionRepository,
    organismRepository: deps.organismRepository,
  });

  if (!accessDecision.allowed) {
    throw new AccessDeniedError(input.integratedBy, 'integrate-proposal', proposal.organismId);
  }

  // Evaluate against policy organisms
  const evaluation = await evaluateProposal(proposal, {
    compositionRepository: deps.compositionRepository,
    stateRepository: deps.stateRepository,
    contentTypeRegistry: deps.contentTypeRegistry,
  });

  if (!evaluation.passed) {
    const declineReasons = evaluation.results
      .filter((r) => r.result.decision === 'decline')
      .map((r) => r.result.reason ?? 'Policy declined')
      .join('; ');

    // Auto-decline the proposal
    const now = deps.identityGenerator.timestamp();
    const declinedProposal: Proposal = {
      ...proposal,
      status: 'declined',
      resolvedAt: now,
      resolvedBy: input.integratedBy,
      declineReason: `Policy evaluation failed: ${declineReasons}`,
    };
    const declined = await deps.proposalRepository.update(declinedProposal);
    if (!declined) {
      throw new ProposalAlreadyResolvedError(input.proposalId, 'integrated');
    }

    const declineEvent: DomainEvent = {
      id: deps.identityGenerator.eventId(),
      type: 'proposal.declined',
      organismId: proposal.organismId,
      actorId: input.integratedBy,
      occurredAt: now,
      payload: {
        proposalId: proposal.id,
        reason: declinedProposal.declineReason,
        policyDriven: true,
      },
    };
    await deps.eventPublisher.publish(declineEvent);

    return { outcome: 'policy-declined', proposal: declinedProposal };
  }

  const now = deps.identityGenerator.timestamp();
  let newState: OrganismState | undefined;

  switch (proposal.mutation.kind) {
    case 'append-state': {
      const currentState = await deps.stateRepository.findCurrentByOrganismId(proposal.organismId);
      const contract = deps.contentTypeRegistry.get(proposal.mutation.contentTypeId);
      if (!contract) {
        throw new ContentTypeNotRegisteredError(proposal.mutation.contentTypeId);
      }
      const validation = contract.validate(proposal.mutation.payload, { previousPayload: currentState?.payload });
      if (!validation.valid) {
        throw new ValidationFailedError(proposal.mutation.contentTypeId, validation.issues);
      }

      const appendedState: OrganismState = {
        id: deps.identityGenerator.stateId(),
        organismId: proposal.organismId,
        contentTypeId: proposal.mutation.contentTypeId,
        payload: proposal.mutation.payload,
        createdAt: now,
        createdBy: proposal.proposedBy,
        sequenceNumber: currentState ? currentState.sequenceNumber + 1 : 1,
        parentStateId: currentState?.id,
      };

      await deps.stateRepository.append(appendedState);
      newState = appendedState;
      break;
    }

    case 'compose':
      await composeOrganism(
        {
          parentId: proposal.organismId,
          childId: proposal.mutation.childId,
          composedBy: input.integratedBy,
          position: proposal.mutation.position,
          enforceAccess: false,
        },
        {
          organismRepository: deps.organismRepository,
          compositionRepository: deps.compositionRepository,
          visibilityRepository: deps.visibilityRepository,
          surfaceRepository: deps.surfaceRepository,
          relationshipRepository: deps.relationshipRepository,
          eventPublisher: deps.eventPublisher,
          identityGenerator: deps.identityGenerator,
        },
      );
      break;

    case 'decompose':
      await decomposeOrganism(
        {
          parentId: proposal.organismId,
          childId: proposal.mutation.childId,
          decomposedBy: input.integratedBy,
          enforceAccess: false,
        },
        {
          organismRepository: deps.organismRepository,
          compositionRepository: deps.compositionRepository,
          visibilityRepository: deps.visibilityRepository,
          surfaceRepository: deps.surfaceRepository,
          relationshipRepository: deps.relationshipRepository,
          eventPublisher: deps.eventPublisher,
          identityGenerator: deps.identityGenerator,
        },
      );
      break;

    case 'change-visibility':
      await changeVisibility(
        {
          organismId: proposal.organismId,
          level: proposal.mutation.level,
          changedBy: input.integratedBy,
          enforceAccess: false,
        },
        {
          organismRepository: deps.organismRepository,
          visibilityRepository: deps.visibilityRepository,
          surfaceRepository: deps.surfaceRepository,
          relationshipRepository: deps.relationshipRepository,
          compositionRepository: deps.compositionRepository,
          eventPublisher: deps.eventPublisher,
          identityGenerator: deps.identityGenerator,
        },
      );
      break;
  }

  // Mark integrated
  const integratedProposal: Proposal = {
    ...proposal,
    status: 'integrated',
    resolvedAt: now,
    resolvedBy: input.integratedBy,
  };
  const integrated = await deps.proposalRepository.update(integratedProposal);
  if (!integrated) {
    throw new ProposalAlreadyResolvedError(input.proposalId, 'integrated');
  }

  const event: DomainEvent = {
    id: deps.identityGenerator.eventId(),
    type: 'proposal.integrated',
    organismId: proposal.organismId,
    actorId: input.integratedBy,
    occurredAt: now,
    payload: {
      proposalId: proposal.id,
      mutationKind: proposal.mutation.kind,
      ...(newState
        ? {
            stateId: newState.id,
            sequenceNumber: newState.sequenceNumber,
          }
        : {}),
    },
  };
  await deps.eventPublisher.publish(event);

  return { outcome: 'integrated', proposal: integratedProposal, ...(newState ? { newState } : {}) };
}
