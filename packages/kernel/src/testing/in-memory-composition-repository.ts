import type { OrganismId } from '../identity.js';
import type { CompositionRecord } from '../composition/composition.js';
import type { CompositionRepository } from '../composition/composition-repository.js';

export class InMemoryCompositionRepository implements CompositionRepository {
  private records: CompositionRecord[] = [];

  async save(record: CompositionRecord): Promise<void> {
    this.records.push(record);
  }

  async remove(parentId: OrganismId, childId: OrganismId): Promise<void> {
    this.records = this.records.filter(
      (r) => !(r.parentId === parentId && r.childId === childId),
    );
  }

  async findChildren(parentId: OrganismId): Promise<ReadonlyArray<CompositionRecord>> {
    return this.records.filter((r) => r.parentId === parentId);
  }

  async findParent(childId: OrganismId): Promise<CompositionRecord | undefined> {
    return this.records.find((r) => r.childId === childId);
  }

  async exists(parentId: OrganismId, childId: OrganismId): Promise<boolean> {
    return this.records.some((r) => r.parentId === parentId && r.childId === childId);
  }
}
