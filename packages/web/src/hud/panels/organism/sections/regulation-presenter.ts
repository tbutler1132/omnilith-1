/**
 * Regulation presenter — boundary-local projection of regulatory children.
 *
 * Keeps the regulation panel focused on one job: list visible regulatory
 * organisms composed directly inside a boundary organism.
 */

import type { OrganismMarkerData } from '../../../../hooks/use-organism.js';

export const REGULATORY_CONTENT_TYPE_IDS = ['sensor', 'variable', 'response-policy', 'action'] as const;
export type RegulatoryContentTypeId = (typeof REGULATORY_CONTENT_TYPE_IDS)[number];

const REGULATORY_CONTENT_TYPE_SET: ReadonlySet<string> = new Set(REGULATORY_CONTENT_TYPE_IDS);

export interface RegulatoryChild {
  readonly childId: string;
  readonly name: string;
  readonly contentTypeId: RegulatoryContentTypeId;
}

export function isRegulatoryContentTypeId(contentTypeId: string | undefined): contentTypeId is RegulatoryContentTypeId {
  return contentTypeId !== undefined && REGULATORY_CONTENT_TYPE_SET.has(contentTypeId);
}

export function presentRegulatoryChildren(
  childIds: ReadonlyArray<string>,
  markerDataById: Record<string, OrganismMarkerData> | undefined,
): ReadonlyArray<RegulatoryChild> {
  const regulatoryChildren: RegulatoryChild[] = [];

  for (const childId of childIds) {
    const marker = markerDataById?.[childId];
    if (!marker || marker.kind !== 'available') {
      continue;
    }

    const contentTypeId = marker.data.currentState?.contentTypeId;
    if (!isRegulatoryContentTypeId(contentTypeId)) {
      continue;
    }

    regulatoryChildren.push({
      childId,
      name: marker.data.organism.name,
      contentTypeId,
    });
  }

  return regulatoryChildren;
}
