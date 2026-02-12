/**
 * CompositionRepository — outbound port for persisting composition records.
 */

import type { OrganismId } from '../identity.js';
import type { CompositionRecord } from './composition.js';

export interface CompositionRepository {
  save(record: CompositionRecord): Promise<void>;
  remove(parentId: OrganismId, childId: OrganismId): Promise<void>;
  findChildren(parentId: OrganismId): Promise<ReadonlyArray<CompositionRecord>>;
  findParent(childId: OrganismId): Promise<CompositionRecord | undefined>;
  exists(parentId: OrganismId, childId: OrganismId): Promise<boolean>;
}
