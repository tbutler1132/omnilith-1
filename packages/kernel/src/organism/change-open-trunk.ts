/**
 * changeOpenTrunk — update whether an organism accepts direct state appends.
 *
 * Open-trunk is part of an organism's regulatory mode. Stewards can switch
 * between open-trunk and proposal-required tending as the organism matures.
 * This use case keeps access checks and event emission consistent.
 */

import type { CompositionRepository } from '../composition/composition-repository.js';
import { AccessDeniedError, OrganismNotFoundError } from '../errors.js';
import type { DomainEvent } from '../events/event.js';
import type { EventPublisher } from '../events/event-publisher.js';
import type { IdentityGenerator, OrganismId, UserId } from '../identity.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';
import { checkAccess } from '../visibility/access-control.js';
import type { SurfaceRepository } from '../visibility/surface-repository.js';
import type { VisibilityRepository } from '../visibility/visibility-repository.js';
import type { Organism } from './organism.js';
import type { OrganismRepository } from './organism-repository.js';

export interface ChangeOpenTrunkInput {
  readonly organismId: OrganismId;
  readonly openTrunk: boolean;
  readonly changedBy: UserId;
  readonly enforceAccess?: boolean;
}

export interface ChangeOpenTrunkDeps {
  readonly organismRepository: OrganismRepository;
  readonly visibilityRepository: VisibilityRepository;
  readonly surfaceRepository?: SurfaceRepository;
  readonly relationshipRepository: RelationshipRepository;
  readonly compositionRepository: CompositionRepository;
  readonly eventPublisher: EventPublisher;
  readonly identityGenerator: IdentityGenerator;
}

export async function changeOpenTrunk(input: ChangeOpenTrunkInput, deps: ChangeOpenTrunkDeps): Promise<Organism> {
  const organism = await deps.organismRepository.findById(input.organismId);
  if (!organism) {
    throw new OrganismNotFoundError(input.organismId);
  }

  if (input.enforceAccess ?? true) {
    const accessDecision = await checkAccess(input.changedBy, input.organismId, 'change-open-trunk', {
      visibilityRepository: deps.visibilityRepository,
      surfaceRepository: deps.surfaceRepository,
      relationshipRepository: deps.relationshipRepository,
      compositionRepository: deps.compositionRepository,
      organismRepository: deps.organismRepository,
    });

    if (!accessDecision.allowed) {
      throw new AccessDeniedError(input.changedBy, 'change-open-trunk', input.organismId);
    }
  }

  if (organism.openTrunk === input.openTrunk) {
    return organism;
  }

  const updated = await deps.organismRepository.setOpenTrunk(input.organismId, input.openTrunk);
  if (!updated) {
    throw new OrganismNotFoundError(input.organismId);
  }

  const now = deps.identityGenerator.timestamp();
  const event: DomainEvent = {
    id: deps.identityGenerator.eventId(),
    type: 'organism.open-trunk-changed',
    organismId: input.organismId,
    actorId: input.changedBy,
    occurredAt: now,
    payload: {
      openTrunk: input.openTrunk,
    },
  };
  await deps.eventPublisher.publish(event);

  return {
    ...organism,
    openTrunk: input.openTrunk,
  };
}
