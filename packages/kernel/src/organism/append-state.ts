/**
 * appendState — direct state change for open-trunk organisms.
 *
 * Open-trunk organisms accept direct state changes without proposals.
 * Non-open-trunk organisms must go through the proposal mechanism.
 * This use case enforces that distinction.
 */

import type { OrganismId, ContentTypeId, UserId, IdentityGenerator } from '../identity.js';
import type { ContentTypeRegistry } from '../content-types/content-type-registry.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { OrganismRepository } from './organism-repository.js';
import type { StateRepository } from './state-repository.js';
import type { OrganismState } from './organism-state.js';
import type { DomainEvent } from '../events/event.js';
import {
  OrganismNotFoundError,
  AccessDeniedError,
  ContentTypeNotRegisteredError,
  ValidationFailedError,
} from '../errors.js';

export interface AppendStateInput {
  readonly organismId: OrganismId;
  readonly contentTypeId: ContentTypeId;
  readonly payload: unknown;
  readonly appendedBy: UserId;
}

export interface AppendStateDeps {
  readonly organismRepository: OrganismRepository;
  readonly stateRepository: StateRepository;
  readonly contentTypeRegistry: ContentTypeRegistry;
  readonly eventPublisher: EventPublisher;
  readonly identityGenerator: IdentityGenerator;
}

export async function appendState(
  input: AppendStateInput,
  deps: AppendStateDeps,
): Promise<OrganismState> {
  const organism = await deps.organismRepository.findById(input.organismId);
  if (!organism) {
    throw new OrganismNotFoundError(input.organismId);
  }

  if (!organism.openTrunk) {
    throw new AccessDeniedError(
      input.appendedBy,
      'append-state',
      input.organismId,
    );
  }

  const contract = deps.contentTypeRegistry.get(input.contentTypeId);
  if (!contract) {
    throw new ContentTypeNotRegisteredError(input.contentTypeId);
  }

  const validation = contract.validate(input.payload);
  if (!validation.valid) {
    throw new ValidationFailedError(input.contentTypeId, validation.issues);
  }

  const currentState = await deps.stateRepository.findCurrentByOrganismId(input.organismId);
  const now = deps.identityGenerator.timestamp();

  const newState: OrganismState = {
    id: deps.identityGenerator.stateId(),
    organismId: input.organismId,
    contentTypeId: input.contentTypeId,
    payload: input.payload,
    createdAt: now,
    createdBy: input.appendedBy,
    sequenceNumber: currentState ? currentState.sequenceNumber + 1 : 1,
    parentStateId: currentState?.id,
  };

  await deps.stateRepository.append(newState);

  const event: DomainEvent = {
    id: deps.identityGenerator.eventId(),
    type: 'state.appended',
    organismId: input.organismId,
    actorId: input.appendedBy,
    occurredAt: now,
    payload: {
      stateId: newState.id,
      contentTypeId: input.contentTypeId,
      sequenceNumber: newState.sequenceNumber,
    },
  };
  await deps.eventPublisher.publish(event);

  return newState;
}
