/**
 * GitHub repository renderer — thin read path for repository twins.
 *
 * Shows external repository identity and sync posture without editing
 * controls so the POC can remain focused on integration flow.
 */

import type { RendererProps } from './registry.js';

interface GitHubRepositorySync {
  status?: string;
  lastSyncedAt?: number;
  lastError?: string;
}

interface GitHubRepositoryPayload {
  owner?: string;
  name?: string;
  defaultBranch?: string;
  repositoryUrl?: string;
  sync?: GitHubRepositorySync;
}

function formatTimestamp(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

export function GitHubRepositoryRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as GitHubRepositoryPayload;
  const sync = payload?.sync ?? {};
  const owner = payload?.owner ?? 'unknown-owner';
  const name = payload?.name ?? 'unknown-repository';

  return (
    <div className="github-repository-renderer">
      <header className="github-repository-header">
        <span className="github-repository-badge">github-repository</span>
        <h2>
          {owner}/{name}
        </h2>
      </header>

      <div className="github-repository-fields">
        <div>
          <span className="github-label">Default branch</span>
          <span>{payload?.defaultBranch ?? '—'}</span>
        </div>
        <div>
          <span className="github-label">Sync status</span>
          <span>{sync.status ?? 'pending'}</span>
        </div>
        <div>
          <span className="github-label">Last synced</span>
          <span>{formatTimestamp(sync.lastSyncedAt)}</span>
        </div>
      </div>

      {payload?.repositoryUrl ? (
        <a className="github-repository-link" href={payload.repositoryUrl} target="_blank" rel="noreferrer">
          Open on GitHub
        </a>
      ) : null}

      {sync.lastError ? <p className="github-error">{sync.lastError}</p> : null}
    </div>
  );
}
