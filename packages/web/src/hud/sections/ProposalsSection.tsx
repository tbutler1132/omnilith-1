/**
 * ProposalsSection — displays and manages proposals for an organism.
 *
 * Lists open, integrated, and declined proposals with action buttons
 * for integrate/decline on open proposals.
 */

import { useState } from 'react';
import { declineProposal, integrateProposal } from '../../api/organisms.js';
import { useProposals } from '../../hooks/use-organism.js';
import { formatDate } from './format-date.js';

interface ProposalsSectionProps {
  organismId: string;
  refreshKey: number;
}

export function ProposalsSection({ organismId, refreshKey: parentRefresh }: ProposalsSectionProps) {
  const [localRefresh, setLocalRefresh] = useState(0);
  const combinedRefresh = parentRefresh + localRefresh;

  const { data: proposals } = useProposals(organismId, combinedRefresh);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleIntegrate(proposalId: string) {
    setActionInProgress(proposalId);
    setError('');
    try {
      await integrateProposal(proposalId);
      setLocalRefresh((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to integrate');
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleDecline(proposalId: string) {
    setActionInProgress(proposalId);
    setError('');
    try {
      await declineProposal(proposalId);
      setLocalRefresh((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline');
    } finally {
      setActionInProgress(null);
    }
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="hud-info-section">
        <span className="hud-info-label">Proposals</span>
        <span className="hud-info-dim">No proposals</span>
      </div>
    );
  }

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Proposals</span>
      {proposals.map((p) => (
        <div key={p.id} className="hud-info-proposal">
          <span className={`hud-info-proposal-status hud-info-proposal-status--${p.status}`}>{p.status}</span>
          <span className="hud-info-proposal-detail">
            {p.proposedContentTypeId} by {p.proposedBy.slice(0, 8)}, {formatDate(p.createdAt)}
          </span>
          {p.status === 'open' && (
            <span className="hud-proposal-actions">
              <button
                type="button"
                className="hud-proposal-btn hud-proposal-btn--integrate"
                onClick={() => handleIntegrate(p.id)}
                disabled={actionInProgress === p.id}
              >
                Integrate
              </button>
              <button
                type="button"
                className="hud-proposal-btn hud-proposal-btn--decline"
                onClick={() => handleDecline(p.id)}
                disabled={actionInProgress === p.id}
              >
                Decline
              </button>
            </span>
          )}
        </div>
      ))}
      {error && <span className="hud-info-error">{error}</span>}
    </div>
  );
}
