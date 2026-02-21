/**
 * GitHub issue content type — a twin organism for an external issue.
 *
 * The issue twin preserves proposal traceability and allows cybernetic
 * organisms to observe external implementation pressure inside Omnilith.
 */

import type { OrganismId, ProposalId, Timestamp } from '@omnilith/kernel';

export type GitHubIssueState = 'open' | 'closed';

export interface GitHubIssueSync {
  readonly status: 'pending' | 'synced' | 'failed';
  readonly lastSyncedAt?: Timestamp;
  readonly lastError?: string;
}

export interface GitHubIssuePayload {
  readonly repositoryOrganismId: OrganismId;
  readonly sourceProposalId: ProposalId;
  readonly sourceOrganismId: OrganismId;
  readonly externalIssueNumber?: number;
  readonly externalIssueUrl?: string;
  readonly title: string;
  readonly body: string;
  readonly state: GitHubIssueState;
  readonly labels: ReadonlyArray<string>;
  readonly sync: GitHubIssueSync;
}
