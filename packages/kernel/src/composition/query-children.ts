/**
 * queryChildren — retrieve all organisms composed inside a parent.
 */

import type { OrganismId } from '../identity.js';
import type { CompositionRecord } from './composition.js';
import type { CompositionRepository } from './composition-repository.js';

export interface QueryChildrenDeps {
  readonly compositionRepository: CompositionRepository;
}

export async function queryChildren(
  parentId: OrganismId,
  deps: QueryChildrenDeps,
): Promise<ReadonlyArray<CompositionRecord>> {
  return deps.compositionRepository.findChildren(parentId);
}
