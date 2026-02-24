/**
 * decomposeOrganism — remove a child organism from its parent.
 */

import { CompositionError } from '../errors.js';
import type { DomainEvent } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { IdentityGenerator, OrganismId, UserId } from '../identity.js';
import type { OrganismRepository } from '../organism/organism-repository.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';
import { checkAccessOrThrow } from '../visibility/check-access.js';
import type { SurfaceRepository } from '../visibility/surface-repository.js';
import type { VisibilityRepository } from '../visibility/visibility-repository.js';
import type { CompositionRepository } from './composition-repository.js';

export interface DecomposeOrganismInput {
  readonly parentId: OrganismId;
  readonly childId: OrganismId;
  readonly decomposedBy: UserId;
  readonly enforceAccess?: boolean;
}

export interface DecomposeOrganismDeps {
  readonly organismRepository: OrganismRepository;
  readonly compositionRepository: CompositionRepository;
  readonly visibilityRepository: VisibilityRepository;
  readonly surfaceRepository?: SurfaceRepository;
  readonly relationshipRepository: RelationshipRepository;
  readonly eventPublisher: EventPublisher;
  readonly identityGenerator: IdentityGenerator;
}

export async function decomposeOrganism(input: DecomposeOrganismInput, deps: DecomposeOrganismDeps): Promise<void> {
  if (input.enforceAccess ?? true) {
    await checkAccessOrThrow(input.decomposedBy, input.parentId, 'decompose', {
      visibilityRepository: deps.visibilityRepository,
      surfaceRepository: deps.surfaceRepository,
      relationshipRepository: deps.relationshipRepository,
      compositionRepository: deps.compositionRepository,
      organismRepository: deps.organismRepository,
    });
  }

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
