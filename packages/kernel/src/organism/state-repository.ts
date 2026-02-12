/**
 * StateRepository — outbound port for persisting organism states.
 *
 * States are append-only. The repository never modifies existing states.
 */

import type { StateId, OrganismId } from '../identity.js';
import type { OrganismState } from './organism-state.js';

export interface StateRepository {
  append(state: OrganismState): Promise<void>;
  findById(id: StateId): Promise<OrganismState | undefined>;
  findCurrentByOrganismId(organismId: OrganismId): Promise<OrganismState | undefined>;
  findHistoryByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<OrganismState>>;
}
