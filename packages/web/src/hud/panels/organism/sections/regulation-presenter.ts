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

export interface RegulatoryChildrenByContentType {
  readonly contentTypeId: RegulatoryContentTypeId;
  readonly children: ReadonlyArray<RegulatoryChild>;
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

export function groupRegulatoryChildrenByContentType(
  regulatoryChildren: ReadonlyArray<RegulatoryChild>,
): ReadonlyArray<RegulatoryChildrenByContentType> {
  const groupedChildren = new Map<RegulatoryContentTypeId, RegulatoryChild[]>();

  for (const child of regulatoryChildren) {
    const childrenForContentType = groupedChildren.get(child.contentTypeId);
    if (childrenForContentType) {
      childrenForContentType.push(child);
      continue;
    }

    groupedChildren.set(child.contentTypeId, [child]);
  }

  const groupedRegulatoryChildren: RegulatoryChildrenByContentType[] = [];

  for (const contentTypeId of REGULATORY_CONTENT_TYPE_IDS) {
    const children = groupedChildren.get(contentTypeId);
    if (!children || children.length === 0) {
      continue;
    }

    groupedRegulatoryChildren.push({
      contentTypeId,
      children,
    });
  }

  return groupedRegulatoryChildren;
}
