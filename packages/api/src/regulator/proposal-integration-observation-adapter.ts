/**
 * Proposal integration observation adapter.
 *
 * Maps internal proposal integration events into sensor observations so
 * cybernetic loops can react to internal governance activity.
 */

import type { Proposal, Timestamp, UserId } from '@omnilith/kernel';
import { recordObservation } from '@omnilith/kernel';
import type { Container } from '../container.js';
import { resolveObservationActor } from './resolve-observation-actor.js';

interface SensorPayloadLike {
  readonly targetOrganismId?: string;
  readonly metric?: string;
}

function toSensorPayload(value: unknown): SensorPayloadLike | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as SensorPayloadLike;
}

export async function recordProposalIntegrationObservations(
  container: Container,
  proposal: Proposal,
  integratedBy: UserId,
): Promise<number> {
  const children = await container.compositionRepository.findChildren(proposal.organismId);
  let recorded = 0;
  const sampledAt = container.identityGenerator.timestamp() as Timestamp;

  for (const child of children) {
    const state = await container.stateRepository.findCurrentByOrganismId(child.childId);
    if (!state || state.contentTypeId !== 'sensor') {
      continue;
    }

    const payload = toSensorPayload(state.payload);
    if (!payload) {
      continue;
    }

    if (payload.metric !== 'proposals') {
      continue;
    }

    if (payload.targetOrganismId !== proposal.organismId) {
      continue;
    }

    const observationActor = await resolveObservationActor(container, {
      sensorOrganismId: child.childId,
      targetOrganismId: proposal.organismId,
      preferredActorIds: [integratedBy],
    });
    if (!observationActor) {
      console.error('Failed to resolve authorized actor for proposal integration observation:', {
        sensorOrganismId: child.childId,
        targetOrganismId: proposal.organismId,
      });
      continue;
    }

    try {
      await recordObservation(
        {
          organismId: child.childId,
          targetOrganismId: proposal.organismId,
          metric: 'proposals',
          value: 1,
          sampledAt,
          observedBy: observationActor,
        },
        {
          organismRepository: container.organismRepository,
          eventPublisher: container.eventPublisher,
          identityGenerator: container.identityGenerator,
          visibilityRepository: container.visibilityRepository,
          relationshipRepository: container.relationshipRepository,
          compositionRepository: container.compositionRepository,
        },
      );
      recorded += 1;
    } catch (error) {
      console.error('Failed to record proposal integration observation:', error);
    }
  }

  return recorded;
}
