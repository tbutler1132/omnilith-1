/**
 * My organisms presenter — map-level projection for cadence-relevant organisms.
 *
 * Resolves the current user's steward/founder organisms and filters to those
 * that already contain at least one boundary cadence organism.
 */

import type { Relationship } from '../../../api/types.js';
import type { OrganismMarkerData } from '../../../hooks/use-organism.js';

export type MyOrganismRole = 'founder' | 'steward';

export interface PresentedMyOrganism {
  readonly organismId: string;
  readonly name: string;
  readonly contentTypeId: string | undefined;
  readonly roles: ReadonlyArray<MyOrganismRole>;
  readonly cadenceChildCount: number;
}

function rolePriority(role: MyOrganismRole): number {
  if (role === 'founder') return 2;
  return 1;
}

function byRolePriority(a: MyOrganismRole, b: MyOrganismRole): number {
  return rolePriority(b) - rolePriority(a);
}

export function isCadenceRelevantRelationship(relationship: Relationship): boolean {
  if (relationship.type === 'stewardship') {
    return true;
  }
  return relationship.type === 'membership' && relationship.role === 'founder';
}

function resolveRolesForRelationship(relationship: Relationship): MyOrganismRole[] {
  if (relationship.type === 'stewardship') {
    return ['steward'];
  }
  if (relationship.type === 'membership' && relationship.role === 'founder') {
    return ['founder'];
  }
  return [];
}

export function presentMyCadenceOrganisms(
  relationships: ReadonlyArray<Relationship>,
  markerDataById: Record<string, OrganismMarkerData> | undefined,
  cadenceChildCountByParentId: ReadonlyMap<string, number>,
): ReadonlyArray<PresentedMyOrganism> {
  const rolesByOrganismId = new Map<string, Set<MyOrganismRole>>();

  for (const relationship of relationships) {
    if (!isCadenceRelevantRelationship(relationship)) {
      continue;
    }

    const existingRoles = rolesByOrganismId.get(relationship.organismId) ?? new Set<MyOrganismRole>();
    for (const role of resolveRolesForRelationship(relationship)) {
      existingRoles.add(role);
    }
    rolesByOrganismId.set(relationship.organismId, existingRoles);
  }

  const presented: PresentedMyOrganism[] = [];

  for (const [organismId, roles] of rolesByOrganismId.entries()) {
    const cadenceChildCount = cadenceChildCountByParentId.get(organismId) ?? 0;
    if (cadenceChildCount <= 0) {
      continue;
    }

    const marker = markerDataById?.[organismId];
    if (!marker || marker.kind !== 'available') {
      continue;
    }

    presented.push({
      organismId,
      name: marker.data.organism.name,
      contentTypeId: marker.data.currentState?.contentTypeId,
      roles: [...roles].sort(byRolePriority),
      cadenceChildCount,
    });
  }

  return presented.sort((a, b) => {
    if (a.cadenceChildCount !== b.cadenceChildCount) {
      return b.cadenceChildCount - a.cadenceChildCount;
    }
    return a.name.localeCompare(b.name);
  });
}
