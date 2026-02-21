/**
 * Observation actor resolver.
 *
 * Observation writes require a user who can both record observations on the
 * sensor organism and view the target organism. This resolver picks a
 * deterministic actor so integrations do not silently drop observations when
 * delegated authority differs between boundary and sensor organisms.
 */

import { checkAccess, type OrganismId, type Relationship, type UserId } from '@omnilith/kernel';
import type { Container } from '../container.js';

export interface ResolveObservationActorInput {
  readonly sensorOrganismId: OrganismId;
  readonly targetOrganismId: OrganismId;
  readonly preferredActorIds?: ReadonlyArray<UserId>;
}

function relationshipPriority(relationship: Relationship): number {
  switch (relationship.type) {
    case 'stewardship':
      return 0;
    case 'integration-authority':
      return 1;
    default:
      return 2;
  }
}

function asUserId(value: string | undefined): UserId | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? (trimmed as UserId) : undefined;
}

function dedupeActorIds(values: ReadonlyArray<UserId | undefined>): ReadonlyArray<UserId> {
  const unique = new Set<UserId>();
  for (const value of values) {
    if (value) {
      unique.add(value);
    }
  }
  return [...unique];
}

function orderSensorAuthorityRelationships(relationships: ReadonlyArray<Relationship>): ReadonlyArray<Relationship> {
  return [...relationships]
    .filter((relationship) => relationship.type === 'stewardship' || relationship.type === 'integration-authority')
    .sort((left, right) => {
      const priorityDifference = relationshipPriority(left) - relationshipPriority(right);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      if (left.createdAt !== right.createdAt) {
        return left.createdAt - right.createdAt;
      }

      return left.userId.localeCompare(right.userId);
    });
}

async function canRecordObservationAsActor(
  container: Container,
  actorId: UserId,
  sensorOrganismId: OrganismId,
  targetOrganismId: OrganismId,
): Promise<boolean> {
  const accessDeps = {
    visibilityRepository: container.visibilityRepository,
    relationshipRepository: container.relationshipRepository,
    compositionRepository: container.compositionRepository,
    organismRepository: container.organismRepository,
  };

  const sensorDecision = await checkAccess(actorId, sensorOrganismId, 'record-observation', accessDeps);
  if (!sensorDecision.allowed) {
    return false;
  }

  const targetDecision = await checkAccess(actorId, targetOrganismId, 'view', accessDeps);
  return targetDecision.allowed;
}

export async function resolveObservationActor(
  container: Container,
  input: ResolveObservationActorInput,
): Promise<UserId | undefined> {
  const sensorRelationships = await container.relationshipRepository.findByOrganism(input.sensorOrganismId);
  const orderedRelationshipActors = orderSensorAuthorityRelationships(sensorRelationships).map(
    (relationship) => relationship.userId,
  );

  const runnerUserId = asUserId(process.env.REGULATOR_RUNNER_USER_ID);
  const candidateActorIds = dedupeActorIds([
    ...(input.preferredActorIds ?? []),
    runnerUserId,
    ...orderedRelationshipActors,
  ]);

  for (const candidateActorId of candidateActorIds) {
    const allowed = await canRecordObservationAsActor(
      container,
      candidateActorId,
      input.sensorOrganismId,
      input.targetOrganismId,
    );
    if (allowed) {
      return candidateActorId;
    }
  }

  return undefined;
}
