/**
 * recordObservation — records an observation event for an organism.
 *
 * Observations are append-only event records used by sensor-driven loops.
 * They are part of the event stream, not organism state history.
 */

import type { CompositionRepository } from '../composition/composition-repository.js';
import { ValidationFailedError } from '../errors.js';
import type { ContentTypeId, IdentityGenerator, OrganismId, Timestamp, UserId } from '../identity.js';
import type { OrganismRepository } from '../organism/organism-repository.js';
import type { RelationshipRepository } from '../relationships/relationship-repository.js';
import { checkAccessOrThrow } from '../visibility/check-access.js';
import type { VisibilityRepository } from '../visibility/visibility-repository.js';
import type { DomainEvent } from './event.js';
import type { EventPublisher } from './event-publisher.js';

export interface RecordObservationInput {
  readonly organismId: OrganismId;
  readonly targetOrganismId: OrganismId;
  readonly metric: string;
  readonly value: number;
  readonly sampledAt: Timestamp;
  readonly observedBy: UserId;
}

export interface RecordObservationDeps {
  readonly organismRepository: OrganismRepository;
  readonly eventPublisher: EventPublisher;
  readonly identityGenerator: IdentityGenerator;
  readonly visibilityRepository: VisibilityRepository;
  readonly relationshipRepository: RelationshipRepository;
  readonly compositionRepository: CompositionRepository;
}

export async function recordObservation(
  input: RecordObservationInput,
  deps: RecordObservationDeps,
): Promise<DomainEvent> {
  const issues: string[] = [];
  if (input.metric.trim().length === 0) {
    issues.push('metric must be a non-empty string');
  }
  if (!Number.isFinite(input.value)) {
    issues.push('value must be a finite number');
  }
  if (!Number.isFinite(input.sampledAt)) {
    issues.push('sampledAt must be a finite number');
  }
  if (issues.length > 0) {
    throw new ValidationFailedError('observation' as ContentTypeId, issues);
  }

  const organism = await deps.organismRepository.findById(input.organismId);
  if (!organism) {
    throw new ValidationFailedError('observation' as ContentTypeId, ['organismId must reference an existing organism']);
  }

  await checkAccessOrThrow(input.observedBy, input.organismId, 'record-observation', {
    visibilityRepository: deps.visibilityRepository,
    relationshipRepository: deps.relationshipRepository,
    compositionRepository: deps.compositionRepository,
    organismRepository: deps.organismRepository,
  });
  await checkAccessOrThrow(input.observedBy, input.targetOrganismId, 'view', {
    visibilityRepository: deps.visibilityRepository,
    relationshipRepository: deps.relationshipRepository,
    compositionRepository: deps.compositionRepository,
    organismRepository: deps.organismRepository,
  });

  const event: DomainEvent = {
    id: deps.identityGenerator.eventId(),
    type: 'organism.observed',
    organismId: input.organismId,
    actorId: input.observedBy,
    occurredAt: deps.identityGenerator.timestamp(),
    payload: {
      targetOrganismId: input.targetOrganismId,
      metric: input.metric,
      value: input.value,
      sampledAt: input.sampledAt,
    },
  };

  await deps.eventPublisher.publish(event);
  return event;
}
