/**
 * InMemoryStateRepository — test adapter for immutable organism states.
 *
 * Preserves append and history semantics in memory so state management
 * behavior can be validated quickly in kernel tests.
 */

import type { OrganismId, StateId } from '../identity.js';
import type { OrganismState } from '../organism/organism-state.js';
import type { StateRepository } from '../organism/state-repository.js';

export class InMemoryStateRepository implements StateRepository {
  private states = new Map<StateId, OrganismState>();
  private byOrganism = new Map<OrganismId, OrganismState[]>();

  async append(state: OrganismState): Promise<void> {
    this.states.set(state.id, state);
    const list = this.byOrganism.get(state.organismId) ?? [];
    list.push(state);
    this.byOrganism.set(state.organismId, list);
  }

  async findById(id: StateId): Promise<OrganismState | undefined> {
    return this.states.get(id);
  }

  async findCurrentByOrganismId(organismId: OrganismId): Promise<OrganismState | undefined> {
    const list = this.byOrganism.get(organismId);
    if (!list || list.length === 0) return undefined;
    return list[list.length - 1];
  }

  async findHistoryByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<OrganismState>> {
    return this.byOrganism.get(organismId) ?? [];
  }

  findCurrentStates(): ReadonlyArray<OrganismState> {
    const currentStates: OrganismState[] = [];
    for (const states of this.byOrganism.values()) {
      if (states.length === 0) continue;
      currentStates.push(states[states.length - 1]);
    }
    return currentStates;
  }
}
