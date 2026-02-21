/**
 * GitHub issue renderer — thin read path for issue twins.
 *
 * Exposes status, labels, source proposal linkage, and external issue link
 * so stewards can verify synchronization without full issue management UI.
 */

import type { RendererProps } from './registry.js';

interface GitHubIssueSync {
  status?: string;
  lastSyncedAt?: number;
  lastError?: string;
}

interface GitHubIssuePayload {
  sourceProposalId?: string;
  sourceOrganismId?: string;
  externalIssueNumber?: number;
  externalIssueUrl?: string;
  title?: string;
  body?: string;
  state?: string;
  labels?: string[];
  sync?: GitHubIssueSync;
}

function formatTimestamp(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

export function GitHubIssueRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as GitHubIssuePayload;
  const sync = payload?.sync ?? {};
  const labels = Array.isArray(payload?.labels) ? payload.labels : [];

  return (
    <div className="github-issue-renderer">
      <header className="github-issue-header">
        <span className="github-repository-badge">github-issue</span>
        <h2>{payload?.title ?? 'Untitled Issue'}</h2>
        <span className="github-issue-state">{payload?.state ?? 'open'}</span>
      </header>

      {payload?.body ? <p className="github-issue-body">{payload.body}</p> : null}

      <div className="github-issue-meta">
        <div>
          <span className="github-label">Source proposal</span>
          <span>{payload?.sourceProposalId ?? '—'}</span>
        </div>
        <div>
          <span className="github-label">Source organism</span>
          <span>{payload?.sourceOrganismId ?? '—'}</span>
        </div>
        <div>
          <span className="github-label">Issue number</span>
          <span>{payload?.externalIssueNumber ?? '—'}</span>
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

      {labels.length > 0 ? (
        <div className="github-issue-labels">
          {labels.map((label) => (
            <span key={label} className="github-issue-label">
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {payload?.externalIssueUrl ? (
        <a className="github-repository-link" href={payload.externalIssueUrl} target="_blank" rel="noreferrer">
          Open issue on GitHub
        </a>
      ) : null}

      {sync.lastError ? <p className="github-error">{sync.lastError}</p> : null}
    </div>
  );
}
