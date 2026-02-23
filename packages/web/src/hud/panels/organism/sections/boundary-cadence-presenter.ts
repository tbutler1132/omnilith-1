/**
 * Boundary cadence presenter — identifies Move 48 cadence organisms in one boundary.
 *
 * Keeps cadence matching deterministic by projecting composed children into
 * canonical tabs: trajectory, variables, models, retros, tasks, and inbox.
 */

import type { OrganismMarkerData } from '../../../../hooks/use-organism.js';

export const BOUNDARY_CADENCE_TAB_IDS = ['trajectory', 'variables', 'models', 'retros', 'tasks', 'inbox'] as const;
export type BoundaryCadenceTabId = (typeof BOUNDARY_CADENCE_TAB_IDS)[number];

export const BOUNDARY_CADENCE_TABS: ReadonlyArray<{ id: BoundaryCadenceTabId; label: string }> = [
  { id: 'trajectory', label: 'Trajectory' },
  { id: 'variables', label: 'Variables' },
  { id: 'models', label: 'Models' },
  { id: 'retros', label: 'Retros' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'inbox', label: 'Inbox' },
];

export interface BoundaryCadenceChild {
  readonly tabId: BoundaryCadenceTabId;
  readonly childId: string;
  readonly name: string;
  readonly contentTypeId: string | undefined;
  readonly payload: unknown;
}

export interface BoundaryCadenceChildrenByTab {
  readonly tabId: BoundaryCadenceTabId;
  readonly children: ReadonlyArray<BoundaryCadenceChild>;
}

const CADENCE_SUFFIX_TO_TAB_ID: ReadonlyArray<{ suffix: string; tabId: BoundaryCadenceTabId }> = [
  { suffix: '-trajectory', tabId: 'trajectory' },
  { suffix: '-variables', tabId: 'variables' },
  { suffix: '-models', tabId: 'models' },
  { suffix: '-retros', tabId: 'retros' },
  { suffix: '-tasks', tabId: 'tasks' },
  { suffix: '-inbox', tabId: 'inbox' },
];

const HEADING_SUFFIX_TO_TAB_ID: ReadonlyArray<{ suffix: string; tabId: BoundaryCadenceTabId }> = [
  { suffix: ' trajectory', tabId: 'trajectory' },
  { suffix: ' variables', tabId: 'variables' },
  { suffix: ' models', tabId: 'models' },
  { suffix: ' retros', tabId: 'retros' },
  { suffix: ' tasks', tabId: 'tasks' },
  { suffix: ' inbox', tabId: 'inbox' },
];

function getTextPayloadContent(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const content = (payload as { content?: unknown }).content;
  return typeof content === 'string' ? content : undefined;
}

function getHeadingLineFromContent(payload: unknown): string | undefined {
  const content = getTextPayloadContent(payload);
  if (!content) {
    return undefined;
  }

  const firstHeadingLine = content
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .find((line) => line.startsWith('# '));

  if (!firstHeadingLine) {
    return undefined;
  }

  return firstHeadingLine.slice(2).trim();
}

function resolveBoundaryCadenceTabId(name: string, payload: unknown): BoundaryCadenceTabId | undefined {
  const normalizedName = name.trim().toLowerCase();

  for (const candidate of CADENCE_SUFFIX_TO_TAB_ID) {
    if (normalizedName.endsWith(candidate.suffix)) {
      return candidate.tabId;
    }
  }

  const headingLine = getHeadingLineFromContent(payload);
  if (!headingLine) {
    return undefined;
  }

  for (const candidate of HEADING_SUFFIX_TO_TAB_ID) {
    if (headingLine.endsWith(candidate.suffix)) {
      return candidate.tabId;
    }
  }

  return undefined;
}

export function isBoundaryCadenceTabId(value: string): value is BoundaryCadenceTabId {
  return BOUNDARY_CADENCE_TAB_IDS.includes(value as BoundaryCadenceTabId);
}

export function presentBoundaryCadenceChildren(
  childIds: ReadonlyArray<string>,
  markerDataById: Record<string, OrganismMarkerData> | undefined,
): ReadonlyArray<BoundaryCadenceChild> {
  const cadenceChildren: BoundaryCadenceChild[] = [];

  for (const childId of childIds) {
    const marker = markerDataById?.[childId];
    if (!marker || marker.kind !== 'available') {
      continue;
    }

    const tabId = resolveBoundaryCadenceTabId(marker.data.organism.name, marker.data.currentState?.payload);
    if (!tabId) {
      continue;
    }

    cadenceChildren.push({
      tabId,
      childId,
      name: marker.data.organism.name,
      contentTypeId: marker.data.currentState?.contentTypeId,
      payload: marker.data.currentState?.payload,
    });
  }

  return cadenceChildren;
}

export function groupBoundaryCadenceChildrenByTab(
  cadenceChildren: ReadonlyArray<BoundaryCadenceChild>,
): ReadonlyArray<BoundaryCadenceChildrenByTab> {
  return BOUNDARY_CADENCE_TAB_IDS.map((tabId) => ({
    tabId,
    children: cadenceChildren.filter((child) => child.tabId === tabId),
  }));
}
