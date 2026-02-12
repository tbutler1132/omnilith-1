/**
 * CompositionRecord — the containment relationship between organisms.
 *
 * Composition is the boundary mechanism. An organism inside another
 * organism exists within the parent's boundary. Composition is always
 * a tree — each organism has at most one parent.
 */

import type { OrganismId, UserId, Timestamp } from '../identity.js';

export interface CompositionRecord {
  readonly parentId: OrganismId;
  readonly childId: OrganismId;
  readonly composedAt: Timestamp;
  readonly composedBy: UserId;
  readonly position?: number;
}
