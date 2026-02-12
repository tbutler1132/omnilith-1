/**
 * createOrganism — the threshold act.
 *
 * Creating an organism is assuming stewardship — someone commits to
 * tending something. The organism is created with an initial state,
 * and a stewardship relationship is automatically established.
 */

import type { ContentTypeRegistry } from '../content-types/content-type-registry.js';
import { ContentTypeNotRegisteredError, ValidationFailedError } from '../errors.js';
import type { DomainEvent } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { ContentTypeId, IdentityGenerator, UserId } from '../identity.js';
import type { Relationship } from '../relationships/relationship.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';
import type { Organism } from './organism.js';
import type { OrganismRepository } from './organism-repository.js';
import type { OrganismState } from './organism-state.js';
import type { StateRepository } from './state-repository.js';

export interface CreateOrganismInput {
  readonly contentTypeId: ContentTypeId;
  readonly payload: unknown;
  readonly createdBy: UserId;
  readonly openTrunk?: boolean;
}

export interface CreateOrganismResult {
  readonly organism: Organism;
  readonly initialState: OrganismState;
}

export interface CreateOrganismDeps {
  readonly organismRepository: OrganismRepository;
  readonly stateRepository: StateRepository;
  readonly contentTypeRegistry: ContentTypeRegistry;
  readonly eventPublisher: EventPublisher;
  readonly relationshipRepository: RelationshipRepository;
  readonly identityGenerator: IdentityGenerator;
}

export async function createOrganism(
  input: CreateOrganismInput,
  deps: CreateOrganismDeps,
): Promise<CreateOrganismResult> {
  const contract = deps.contentTypeRegistry.get(input.contentTypeId);
  if (!contract) {
    throw new ContentTypeNotRegisteredError(input.contentTypeId);
  }

  const validation = contract.validate(input.payload);
  if (!validation.valid) {
    throw new ValidationFailedError(input.contentTypeId, validation.issues);
  }

  const now = deps.identityGenerator.timestamp();
  const organismId = deps.identityGenerator.organismId();

  const organism: Organism = {
    id: organismId,
    createdAt: now,
    createdBy: input.createdBy,
    openTrunk: input.openTrunk ?? false,
  };

  const initialState: OrganismState = {
    id: deps.identityGenerator.stateId(),
    organismId,
    contentTypeId: input.contentTypeId,
    payload: input.payload,
    createdAt: now,
    createdBy: input.createdBy,
    sequenceNumber: 1,
  };

  const stewardship: Relationship = {
    id: deps.identityGenerator.relationshipId(),
    type: 'stewardship',
    userId: input.createdBy,
    organismId,
    createdAt: now,
  };

  await deps.organismRepository.save(organism);
  await deps.stateRepository.append(initialState);
  await deps.relationshipRepository.save(stewardship);

  const event: DomainEvent = {
    id: deps.identityGenerator.eventId(),
    type: 'organism.created',
    organismId,
    actorId: input.createdBy,
    occurredAt: now,
    payload: {
      contentTypeId: input.contentTypeId,
      openTrunk: organism.openTrunk,
    },
  };
  await deps.eventPublisher.publish(event);

  return { organism, initialState };
}
