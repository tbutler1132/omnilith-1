/**
 * Access route helpers.
 *
 * Centralizes HTTP-friendly access checks so route handlers can enforce
 * visibility and interaction capabilities with consistent responses.
 */

import { type ActionType, checkAccess, type OrganismId, type UserId } from '@omnilith/kernel';
import type { Context } from 'hono';
import type { Container } from '../container.js';

export async function requireOrganismAccess(
  c: Context,
  container: Container,
  userId: UserId,
  organismId: OrganismId,
  action: ActionType,
): Promise<Response | null> {
  const decision = await checkAccess(userId, organismId, action, {
    visibilityRepository: container.visibilityRepository,
    surfaceRepository: container.surfaceRepository,
    relationshipRepository: container.relationshipRepository,
    compositionRepository: container.compositionRepository,
    organismRepository: container.organismRepository,
  });

  if (decision.allowed) {
    return null;
  }

  if (decision.reason === 'Organism not found') {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ error: decision.reason ?? 'Forbidden' }, 403);
}

export async function requirePublicOrganismView(
  c: Context,
  container: Container,
  organismId: OrganismId,
): Promise<Response | null> {
  const decision = await checkAccess(null, organismId, 'view', {
    visibilityRepository: container.visibilityRepository,
    surfaceRepository: container.surfaceRepository,
    relationshipRepository: container.relationshipRepository,
    compositionRepository: container.compositionRepository,
    organismRepository: container.organismRepository,
  });

  if (decision.allowed) {
    return null;
  }

  return c.json({ error: 'Not found' }, 404);
}
