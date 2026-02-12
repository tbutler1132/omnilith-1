/**
 * Visibility — who can see and interact with an organism.
 *
 * Visibility levels control the perceptual boundary of an organism.
 * Access control builds on visibility to determine what actions
 * are permitted.
 */

import type { OrganismId, Timestamp } from '../identity.js';

export type VisibilityLevel = 'public' | 'members' | 'private';

export interface VisibilityRecord {
  readonly organismId: OrganismId;
  readonly level: VisibilityLevel;
  readonly updatedAt: Timestamp;
}
