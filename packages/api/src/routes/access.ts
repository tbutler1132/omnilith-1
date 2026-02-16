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
