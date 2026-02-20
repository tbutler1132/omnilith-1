/**
 * composeOrganism — place a child organism inside a parent organism.
 *
 * Enforces single-parent (tree not DAG). An organism can only be
 * inside one parent at a time. If it already has a parent, this
 * operation fails.
 */

import { CompositionError, OrganismNotFoundError } from '../errors.js';
import type { DomainEvent } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { IdentityGenerator, OrganismId, UserId } from '../identity.js';
import type { OrganismRepository } from '../organism/organism-repository.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';
import { checkAccessOrThrow } from '../visibility/check-access.js';
import type { VisibilityRepository } from '../visibility/visibility-repository.js';
import type { CompositionRecord } from './composition.js';
import type { CompositionRepository } from './composition-repository.js';

export interface ComposeOrganismInput {
  readonly parentId: OrganismId;
  readonly childId: OrganismId;
  readonly composedBy: UserId;
  readonly position?: number;
  readonly enforceAccess?: boolean;
}

export interface ComposeOrganismDeps {
  readonly organismRepository: OrganismRepository;
  readonly compositionRepository: CompositionRepository;
  readonly visibilityRepository: VisibilityRepository;
  readonly relationshipRepository: RelationshipRepository;
  readonly eventPublisher: EventPublisher;
  readonly identityGenerator: IdentityGenerator;
}

export async function composeOrganism(
  input: ComposeOrganismInput,
  deps: ComposeOrganismDeps,
): Promise<CompositionRecord> {
  if (input.enforceAccess ?? true) {
    await checkAccessOrThrow(input.composedBy, input.parentId, 'compose', {
      visibilityRepository: deps.visibilityRepository,
      relationshipRepository: deps.relationshipRepository,
      compositionRepository: deps.compositionRepository,
      organismRepository: deps.organismRepository,
    });
  }

  const parentExists = await deps.organismRepository.exists(input.parentId);
  if (!parentExists) {
    throw new OrganismNotFoundError(input.parentId);
  }

  const childExists = await deps.organismRepository.exists(input.childId);
  if (!childExists) {
    throw new OrganismNotFoundError(input.childId);
  }

  if (input.parentId === input.childId) {
    throw new CompositionError('An organism cannot be composed inside itself');
  }

  const existingParent = await deps.compositionRepository.findParent(input.childId);
  if (existingParent) {
    throw new CompositionError(`Organism ${input.childId} already has a parent: ${existingParent.parentId}`);
  }

  // Walk up ancestors from parentId to detect cycles
  let ancestor = await deps.compositionRepository.findParent(input.parentId);
  while (ancestor) {
    if (ancestor.parentId === input.childId) {
      throw new CompositionError(`Composing ${input.childId} inside ${input.parentId} would create a cycle`);
    }
    ancestor = await deps.compositionRepository.findParent(ancestor.parentId);
  }

  const now = deps.identityGenerator.timestamp();

  const record: CompositionRecord = {
    parentId: input.parentId,
    childId: input.childId,
    composedAt: now,
    composedBy: input.composedBy,
    position: input.position,
  };

  await deps.compositionRepository.save(record);

  const event: DomainEvent = {
    id: deps.identityGenerator.eventId(),
    type: 'organism.composed',
    organismId: input.parentId,
    actorId: input.composedBy,
    occurredAt: now,
    payload: {
      childId: input.childId,
      position: input.position,
    },
  };
  await deps.eventPublisher.publish(event);

  return record;
}
