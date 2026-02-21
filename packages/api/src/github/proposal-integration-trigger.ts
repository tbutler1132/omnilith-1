/**
 * Proposal integration trigger contract.
 *
 * Route handlers call this after integration so adapter-level automation
 * can enqueue downstream work without changing kernel behavior.
 */

import type { Proposal, UserId } from '@omnilith/kernel';

export interface ProposalIntegrationTriggerInput {
  readonly proposal: Proposal;
  readonly integratedBy: UserId;
}

export interface ProposalIntegrationTrigger {
  handleProposalIntegrated(input: ProposalIntegrationTriggerInput): Promise<void>;
}

export class NoopProposalIntegrationTrigger implements ProposalIntegrationTrigger {
  async handleProposalIntegrated(_input: ProposalIntegrationTriggerInput): Promise<void> {
    // Intentionally blank: automation is disabled.
  }
}
