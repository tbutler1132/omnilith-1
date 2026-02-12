/**
 * Relationship — connective tissue between people and organisms.
 *
 * Relationships are not organisms. They are infrastructure that tracks
 * how users relate to organisms. Three types exist, each with distinct
 * access control implications:
 *
 * - membership: user belongs to a community organism (carries role)
 * - integration-authority: user holds the regulatory function for an organism
 * - stewardship: user assumed responsibility at the threshold
 */

import type { OrganismId, RelationshipId, Timestamp, UserId } from '../identity.js';

export type RelationshipType = 'membership' | 'integration-authority' | 'stewardship';
export type MembershipRole = 'founder' | 'member';

export interface Relationship {
  readonly id: RelationshipId;
  readonly type: RelationshipType;
  readonly userId: UserId;
  readonly organismId: OrganismId;
  readonly role?: MembershipRole;
  readonly createdAt: Timestamp;
}
