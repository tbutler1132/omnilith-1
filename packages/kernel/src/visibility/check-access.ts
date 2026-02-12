/**
 * checkAccessUseCase — use case wrapper around the access control module.
 *
 * Provides a convenient interface that throws AccessDeniedError
 * when access is denied, for use cases that want to fail fast.
 */

import type { UserId, OrganismId } from '../identity.js';
import type { ActionType, AccessControlDeps } from './access-control.js';
import { checkAccess } from './access-control.js';
import { AccessDeniedError } from '../errors.js';

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
