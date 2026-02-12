/**
 * OrganismRepository — outbound port for persisting organisms.
 *
 * Adapters implement this to store organisms in their chosen backend.
 * The kernel operates against this interface without knowing the storage.
 */

import type { OrganismId } from '../identity.js';
import type { Organism } from './organism.js';

export interface OrganismRepository {
  save(organism: Organism): Promise<void>;
  findById(id: OrganismId): Promise<Organism | undefined>;
  exists(id: OrganismId): Promise<boolean>;
}
