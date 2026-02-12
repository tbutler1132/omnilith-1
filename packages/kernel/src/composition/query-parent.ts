/**
 * queryParent — find the parent organism of a given child.
 */

import type { OrganismId } from '../identity.js';
import type { CompositionRecord } from './composition.js';
import type { CompositionRepository } from './composition-repository.js';

export interface QueryParentDeps {
  readonly compositionRepository: CompositionRepository;
}

export async function queryParent(childId: OrganismId, deps: QueryParentDeps): Promise<CompositionRecord | undefined> {
  return deps.compositionRepository.findParent(childId);
}
