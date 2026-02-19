/**
 * Relationships presenter — pure formatting and ordering for relationship rows.
 *
 * Keeps relationship rendering deterministic and testable outside React so the
 * section component can stay focused on data loading and layout.
 */

import type { Relationship, RelationshipType } from '../../../../api/types.js';

export interface RelationshipLike {
  readonly id: string;
  readonly type: RelationshipType;
  readonly userId: string;
  readonly organismId: string;
  readonly role?: Relationship['role'];
  readonly createdAt: number;
}

export interface PresentableRelationship {
  readonly id: string;
  readonly typeLabel: string;
  readonly roleLabel: string | null;
  readonly userLabel: string;
  readonly createdAtLabel: string;
}

const TYPE_LABELS: Record<RelationshipType, string> = {
  stewardship: 'Stewardship',
  'integration-authority': 'Integration authority',
  membership: 'Membership',
};

const TYPE_ORDER: Record<RelationshipType, number> = {
  stewardship: 0,
  'integration-authority': 1,
  membership: 2,
};

function shortUserLabel(userId: string): string {
  return userId.length <= 12 ? userId : userId.slice(0, 12);
}

function formatCreatedAt(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return 'unknown';
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return 'unknown';
  return parsed.toISOString().slice(0, 10);
}

function compareRelationships(a: RelationshipLike, b: RelationshipLike): number {
  const typeDiff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
  if (typeDiff !== 0) return typeDiff;

  if (Number.isFinite(a.createdAt) && Number.isFinite(b.createdAt)) {
    return b.createdAt - a.createdAt;
  }
  return 0;
}

export function presentRelationships(relationships: ReadonlyArray<RelationshipLike>): PresentableRelationship[] {
  return [...relationships].sort(compareRelationships).map((relationship) => ({
    id: relationship.id,
    typeLabel: TYPE_LABELS[relationship.type],
    roleLabel: relationship.role ?? null,
    userLabel: shortUserLabel(relationship.userId),
    createdAtLabel: formatCreatedAt(relationship.createdAt),
  }));
}
