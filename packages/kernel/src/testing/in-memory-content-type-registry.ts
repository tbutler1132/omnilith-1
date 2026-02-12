import type { ContentTypeContract } from '../content-types/content-type-contract.js';
import type { ContentTypeRegistry } from '../content-types/content-type-registry.js';
import type { ContentTypeId } from '../identity.js';

export class InMemoryContentTypeRegistry implements ContentTypeRegistry {
  private types = new Map<ContentTypeId, ContentTypeContract>();

  register(contract: ContentTypeContract): void {
    this.types.set(contract.typeId, contract);
  }

  get(typeId: ContentTypeId): ContentTypeContract | undefined {
    return this.types.get(typeId);
  }

  has(typeId: ContentTypeId): boolean {
    return this.types.has(typeId);
  }

  getAll(): ReadonlyArray<ContentTypeContract> {
    return [...this.types.values()];
  }
}
