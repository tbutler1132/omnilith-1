/**
 * changeVisibility — update an organism's visibility boundary.
 *
 * Visibility is infrastructure and must be mutated through a kernel
 * use case so access checks and event emission stay consistent.
 */

import type { CompositionRepository } from '../composition/composition-repository.js';
import { AccessDeniedError, OrganismNotFoundError } from '../errors.js';
import type { DomainEvent } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { IdentityGenerator, OrganismId, UserId } from '../identity.js';
import type { OrganismRepository } from '../organism/organism-repository.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';
import { checkAccess } from './access-control.js';
import type { SurfaceRepository } from './surface-repository.js';
import type { VisibilityRecord } from './visibility.js';
import type { VisibilityRepository } from './visibility-repository.js';

export interface ChangeVisibilityInput {
  readonly organismId: OrganismId;
  readonly level: VisibilityRecord['level'];
  readonly changedBy: UserId;
  readonly enforceAccess?: boolean;
}

export interface ChangeVisibilityDeps {
  readonly organismRepository: OrganismRepository;
  readonly visibilityRepository: VisibilityRepository;
  readonly surfaceRepository?: SurfaceRepository;
  readonly relationshipRepository: RelationshipRepository;
  readonly compositionRepository: CompositionRepository;
  readonly eventPublisher: EventPublisher;
  readonly identityGenerator: IdentityGenerator;
}

export async function changeVisibility(
  input: ChangeVisibilityInput,
  deps: ChangeVisibilityDeps,
): Promise<VisibilityRecord> {
  const organism = await deps.organismRepository.findById(input.organismId);
  if (!organism) {
    throw new OrganismNotFoundError(input.organismId);
  }

  if (input.enforceAccess ?? true) {
    const accessDecision = await checkAccess(input.changedBy, input.organismId, 'change-visibility', {
      visibilityRepository: deps.visibilityRepository,
      surfaceRepository: deps.surfaceRepository,
      relationshipRepository: deps.relationshipRepository,
      compositionRepository: deps.compositionRepository,
      organismRepository: deps.organismRepository,
    });

    if (!accessDecision.allowed) {
      throw new AccessDeniedError(input.changedBy, 'change-visibility', input.organismId);
    }
  }

  const now = deps.identityGenerator.timestamp();
  const record: VisibilityRecord = {
    organismId: input.organismId,
    level: input.level,
    updatedAt: now,
  };
  await deps.visibilityRepository.save(record);

  const event: DomainEvent = {
    id: deps.identityGenerator.eventId(),
    type: 'visibility.changed',
    organismId: input.organismId,
    actorId: input.changedBy,
    occurredAt: now,
    payload: {
      level: input.level,
    },
  };
  await deps.eventPublisher.publish(event);

  return record;
}
