/**
 * GitHub repository content type — a twin organism for an external repository.
 *
 * This payload captures the stable repository identity and lightweight
 * sync metadata so issue organisms can anchor to a specific external
 * boundary.
 */

import type { Timestamp } from '@omnilith/kernel';

export interface GitHubRepositorySync {
  readonly status: 'pending' | 'synced' | 'failed';
  readonly lastSyncedAt?: Timestamp;
  readonly lastError?: string;
}

export interface GitHubRepositoryPayload {
  readonly provider: 'github';
  readonly owner: string;
  readonly name: string;
  readonly defaultBranch: string;
  readonly repositoryUrl: string;
  readonly installationRef?: string;
  readonly sync: GitHubRepositorySync;
}
