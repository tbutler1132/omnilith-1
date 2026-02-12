/**
 * decomposeOrganism — remove a child organism from its parent.
 */

import { CompositionError } from '../errors.js';
import type { DomainEvent } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { IdentityGenerator, OrganismId, UserId } from '../identity.js';
import type { CompositionRepository } from './composition-repository.js';

export interface DecomposeOrganismInput {
  readonly parentId: OrganismId;
  readonly childId: OrganismId;
  readonly decomposedBy: UserId;
}

export interface DecomposeOrganismDeps {
  readonly compositionRepository: CompositionRepository;
  readonly eventPublisher: EventPublisher;
  readonly identityGenerator: IdentityGenerator;
}

export async function decomposeOrganism(input: DecomposeOrganismInput, deps: DecomposeOrganismDeps): Promise<void> {
  const exists = await deps.compositionRepository.exists(input.parentId, input.childId);
  if (!exists) {
    throw new CompositionError(`Organism ${input.childId} is not composed inside ${input.parentId}`);
  }

  await deps.compositionRepository.remove(input.parentId, input.childId);

  const now = deps.identityGenerator.timestamp();
  const event: DomainEvent = {
    id: deps.identityGenerator.eventId(),
    type: 'organism.decomposed',
    organismId: input.parentId,
    actorId: input.decomposedBy,
    occurredAt: now,
    payload: {
      childId: input.childId,
    },
  };
  await deps.eventPublisher.publish(event);
}
