/**
 * Composition reference content type — an arrangement of organisms.
 *
 * Used for albums, collections, and other ordered groupings.
 * The entries reference organisms by ID with positional ordering.
 */

import type { OrganismId } from '@omnilith/kernel';

export interface CompositionReferencePayload {
  readonly entries: ReadonlyArray<CompositionReferenceEntry>;
  readonly arrangementType: ArrangementType;
}

export interface CompositionReferenceEntry {
  readonly organismId: OrganismId;
  readonly position: number;
  readonly grouping?: string;
}

export type ArrangementType = 'sequential' | 'unordered' | 'grouped';
