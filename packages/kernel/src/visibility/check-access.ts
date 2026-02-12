/**
 * checkAccessUseCase — use case wrapper around the access control module.
 *
 * Provides a convenient interface that throws AccessDeniedError
 * when access is denied, for use cases that want to fail fast.
 */

import { AccessDeniedError } from '../errors.js';
import type { OrganismId, UserId } from '../identity.js';
import type { AccessControlDeps, ActionType } from './access-control.js';
import { checkAccess } from './access-control.js';

export async function checkAccessOrThrow(
  userId: UserId,
  organismId: OrganismId,
  action: ActionType,
  deps: AccessControlDeps,
): Promise<void> {
  const decision = await checkAccess(userId, organismId, action, deps);
  if (!decision.allowed) {
    throw new AccessDeniedError(userId, action, organismId);
  }
}
