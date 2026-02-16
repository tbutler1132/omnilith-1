/**
 * ProposalRepository — outbound port for persisting proposals.
 */

import type { OrganismId, ProposalId } from '../identity.js';
import type { Proposal } from './proposal.js';

export interface ProposalRepository {
  save(proposal: Proposal): Promise<void>;
  update(proposal: Proposal): Promise<boolean>;
  findById(id: ProposalId): Promise<Proposal | undefined>;
  findByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<Proposal>>;
  findOpenByOrganismId(organismId: OrganismId): Promise<ReadonlyArray<Proposal>>;
}
