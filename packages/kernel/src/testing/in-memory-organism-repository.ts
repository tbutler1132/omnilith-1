/**
 * InMemoryOrganismRepository — test adapter for organism identity records.
 *
 * Stores organisms in memory to support deterministic kernel tests with
 * no database dependency.
 */

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

  async setOpenTrunk(id: OrganismId, openTrunk: boolean): Promise<boolean> {
    const organism = this.organisms.get(id);
    if (!organism) {
      return false;
    }

    this.organisms.set(id, {
      ...organism,
      openTrunk,
    });
    return true;
  }

  /** Test infrastructure — not a port method. */
  getAll(): Organism[] {
    return [...this.organisms.values()];
  }
}
