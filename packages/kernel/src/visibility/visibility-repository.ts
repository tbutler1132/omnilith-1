/**
 * VisibilityRepository — outbound port for persisting visibility records.
 */

import type { OrganismId } from '../identity.js';
import type { VisibilityRecord } from './visibility.js';

export interface VisibilityRepository {
  save(record: VisibilityRecord): Promise<void>;
  findByOrganismId(organismId: OrganismId): Promise<VisibilityRecord | undefined>;
}
