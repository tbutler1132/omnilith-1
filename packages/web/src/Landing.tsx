/**
 * Landing — the home page showing all organisms.
 *
 * Fetches organisms from the API and displays them as a card grid.
 * Each card shows the content type, a preview of the payload, and
 * basic metadata. Clicking navigates to the organism detail view.
 */

import { useState } from 'react';
import { Link } from 'react-router';
import { useOrganisms } from './hooks/use-organism.js';
import { ThresholdForm } from './organisms/ThresholdForm.js';

function getPreview(state: { contentTypeId: string; payload: unknown } | undefined): string {
  if (!state) return 'No state yet';

  const payload = state.payload as Record<string, unknown>;

  if (state.contentTypeId === 'text' && typeof payload?.content === 'string') {
    return payload.content || 'Empty';
  }

  if (typeof payload?.name === 'string') return payload.name;
  if (typeof payload?.title === 'string') return payload.title;

  return `${state.contentTypeId} organism`;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface LandingProps {
  userId: string;
  onLogout: () => void;
}

export function Landing({ userId, onLogout }: LandingProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showThreshold, setShowThreshold] = useState(false);
  const { data: organisms, loading, error } = useOrganisms(refreshKey);

  return (
    <div className="page">
      <div className="landing-header">
        <h1>Omnilith</h1>
        <div className="user-info">
          <span>{userId.slice(0, 8)}...</span>
          <button type="button" onClick={() => setShowThreshold(true)}>
            + Threshold
          </button>
          <button type="button" className="secondary" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>

      {loading && <p className="loading">Loading organisms...</p>}
      {error && <p className="loading">Failed to load organisms.</p>}

      {organisms && organisms.length === 0 && (
        <div className="empty-state">
          <h2>Nothing here yet</h2>
          <p>This place is waiting.</p>
          <button type="button" onClick={() => setShowThreshold(true)}>
            Threshold your first organism
          </button>
        </div>
      )}

      {organisms && organisms.length > 0 && (
        <div className="organism-grid">
          {organisms.map(({ organism, currentState }) => (
            <Link key={organism.id} to={`/organisms/${organism.id}`} className="organism-card">
              {currentState && <span className="content-type">{currentState.contentTypeId}</span>}
              <div className="preview">{getPreview(currentState)}</div>
              <div className="meta">
                <span>
                  <span
                    className="vitality-dot"
                    style={{ backgroundColor: currentState ? 'var(--green)' : 'var(--text-dim)' }}
                  />
                  {currentState ? `v${currentState.sequenceNumber}` : 'no state'}
                </span>
                <span>{timeAgo(organism.createdAt)}</span>
                {organism.openTrunk && <span title="Open trunk">open-trunk</span>}
              </div>
              <div className="id">{organism.id}</div>
            </Link>
          ))}
        </div>
      )}

      {showThreshold && (
        <ThresholdForm
          onCreated={() => {
            setShowThreshold(false);
            setRefreshKey((k) => k + 1);
          }}
          onClose={() => setShowThreshold(false)}
        />
      )}
    </div>
  );
}
