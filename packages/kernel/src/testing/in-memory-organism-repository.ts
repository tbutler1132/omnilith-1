import type { OrganismId } from '../identity.js';
import type { Organism } from '../organism/organism.js';
import type { OrganismRepository } from '../organism/organism-repository.js';

export class InMemoryOrganismRepository implements OrganismRepository {
  private organisms = new Map<OrganismId, Organism>();

  async save(organism: Organism): Promise<void> {
    this.organisms.set(organism.id, organism);
  }

  async findById(id: OrganismId): Promise<Organism | undefined> {
    return this.organisms.get(id);
  }

  async exists(id: OrganismId): Promise<boolean> {
    return this.organisms.has(id);
  }
}
