/**
 * InMemoryVisibilityRepository — test adapter for visibility records.
 *
 * Provides in-memory visibility lookups for access control and policy
 * evaluation tests.
 */

import type { OrganismId } from '../identity.js';
import type { VisibilityRecord } from '../visibility/visibility.js';
import type { VisibilityRepository } from '../visibility/visibility-repository.js';

export class InMemoryVisibilityRepository implements VisibilityRepository {
  private records = new Map<OrganismId, VisibilityRecord>();

  async save(record: VisibilityRecord): Promise<void> {
    this.records.set(record.organismId, record);
  }

  async findByOrganismId(organismId: OrganismId): Promise<VisibilityRecord | undefined> {
    return this.records.get(organismId);
  }
}
