/**
 * HudInteriorInfo — universal layer summary for an entered organism.
 *
 * Right-edge sidebar that fades in when the visor is up inside an
 * organism. Shows organism details and provides write actions:
 * compose/decompose children, propose state changes, integrate/decline
 * proposals. Each section is a named function component at module scope.
 */

import { useState } from 'react';
import { composeChild, declineProposal, decomposeChild, integrateProposal } from '../api/organisms.js';
import {
  useChildren,
  useOrganism,
  useParent,
  useProposals,
  useStateHistory,
  useVitality,
} from '../hooks/use-organism.js';
import { OrganismPicker } from '../organisms/OrganismPicker.js';
import { ProposeForm } from '../organisms/ProposeForm.js';
import { ThresholdForm } from '../organisms/ThresholdForm.js';
import { usePlatform } from '../platform/PlatformContext.js';
import { getPreviewText } from '../utils/preview-text.js';

interface HudInteriorInfoProps {
  organismId: string;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Vitality Section ── */

function VitalitySection({ organismId, refreshKey }: { organismId: string; refreshKey: number }) {
  const { data: vitality } = useVitality(organismId, refreshKey);

  if (!vitality) return null;

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Vitality</span>
      <div className="hud-info-row">
        <span className="hud-info-row-label">State changes</span>
        <span className="hud-info-row-value">{vitality.recentStateChanges}</span>
      </div>
      <div className="hud-info-row">
        <span className="hud-info-row-label">Open proposals</span>
        <span className="hud-info-row-value">{vitality.openProposalCount}</span>
      </div>
      {vitality.lastActivityAt != null && (
        <div className="hud-info-row">
          <span className="hud-info-row-label">Last activity</span>
          <span className="hud-info-row-value">{formatDate(vitality.lastActivityAt)}</span>
        </div>
      )}
    </div>
  );
}

/* ── Child Item (used by Composition Section) ── */

function ChildItem({
  childId,
  onRemove,
  removing,
}: {
  childId: string;
  onRemove: (childId: string) => void;
  removing: boolean;
}) {
  const { data } = useOrganism(childId);
  const { exitOrganism, focusOrganism } = usePlatform();

  const contentType = data?.currentState?.contentTypeId ?? '...';
  const preview = data?.currentState ? getPreviewText(data.currentState, 30) : '...';

  function handleClick() {
    exitOrganism();
    focusOrganism(childId);
  }

  return (
    <div className="hud-info-child-row">
      <button type="button" className="hud-info-child" onClick={handleClick}>
        <span className="hud-info-child-badge">{contentType}</span>
        <span className="hud-info-child-name">{preview}</span>
      </button>
      <button
        type="button"
        className="hud-info-child-remove"
        onClick={() => onRemove(childId)}
        disabled={removing}
        title="Decompose"
      >
        &times;
      </button>
    </div>
  );
}

/* ── Composition Section ── */

type ComposeAction = 'compose' | 'create' | null;

function CompositionSection({ organismId, refreshKey: parentRefresh }: { organismId: string; refreshKey: number }) {
  const [localRefresh, setLocalRefresh] = useState(0);
  const combinedRefresh = parentRefresh + localRefresh;

  const { data: parent } = useParent(organismId, combinedRefresh);
  const { data: children } = useChildren(organismId, combinedRefresh);
  const { exitOrganism, focusOrganism } = usePlatform();

  const [action, setAction] = useState<ComposeAction>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const childIds = (children ?? []).slice(0, 10).map((c) => c.childId);
  const totalChildren = children?.length ?? 0;

  function handleParentClick() {
    if (!parent) return;
    exitOrganism();
    focusOrganism(parent.parentId);
  }

  async function handleDecompose(childId: string) {
    setRemovingId(childId);
    setError('');
    try {
      await decomposeChild(organismId, childId);
      setLocalRefresh((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decompose');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleComposePick(childId: string) {
    setError('');
    try {
      await composeChild(organismId, childId);
      setLocalRefresh((k) => k + 1);
      setAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compose');
    }
  }

  async function handleCreateAndCompose(newOrganismId: string) {
    setError('');
    try {
      await composeChild(organismId, newOrganismId);
      setLocalRefresh((k) => k + 1);
      setAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compose');
    }
  }

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Composition</span>
      {parent ? (
        <div className="hud-info-row">
          <span className="hud-info-row-label">Inside of</span>
          <button type="button" className="hud-info-parent-link" onClick={handleParentClick}>
            {parent.parentId.slice(0, 12)}
          </button>
        </div>
      ) : (
        <span className="hud-info-dim">No parent</span>
      )}
      {childIds.length > 0 && (
        <>
          <span className="hud-info-row-label" style={{ marginTop: 8 }}>
            Contains
          </span>
          {childIds.map((id) => (
            <ChildItem key={id} childId={id} onRemove={handleDecompose} removing={removingId === id} />
          ))}
          {totalChildren > 10 && <span className="hud-info-dim">+{totalChildren - 10} more</span>}
        </>
      )}
      {childIds.length === 0 && !parent && <span className="hud-info-dim">No children</span>}

      {/* Compose actions */}
      {action === null && (
        <div className="hud-compose-actions">
          <button type="button" className="hud-compose-btn" onClick={() => setAction('compose')}>
            + Compose existing
          </button>
          <button type="button" className="hud-compose-btn" onClick={() => setAction('create')}>
            + Create &amp; compose
          </button>
        </div>
      )}

      {action === 'compose' && (
        <OrganismPicker
          excludeIds={[organismId, ...childIds]}
          onSelect={handleComposePick}
          onCancel={() => setAction(null)}
        />
      )}

      {action === 'create' && (
        <ThresholdForm inline onCreated={handleCreateAndCompose} onClose={() => setAction(null)} />
      )}

      {error && <span className="hud-info-error">{error}</span>}
    </div>
  );
}

/* ── Proposals Section ── */

function ProposalsSection({ organismId, refreshKey: parentRefresh }: { organismId: string; refreshKey: number }) {
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

/* ── State History Section ── */

function StateHistorySection({ organismId, refreshKey }: { organismId: string; refreshKey: number }) {
  const { data: states } = useStateHistory(organismId, refreshKey);

  if (!states || states.length === 0) {
    return (
      <div className="hud-info-section">
        <span className="hud-info-label">State history</span>
        <span className="hud-info-dim">No states</span>
      </div>
    );
  }

  const reversed = [...states].reverse();

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">State history</span>
      {reversed.map((s) => (
        <div key={s.id} className="hud-info-state">
          <span className="hud-info-state-num">#{s.sequenceNumber}</span>
          <span className="hud-info-state-detail">
            {s.contentTypeId}, {formatDate(s.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Governance Section ── */

function GovernanceChildCheck({ childId }: { childId: string }) {
  const { data } = useOrganism(childId);
  if (!data?.currentState) return null;
  if (data.currentState.contentTypeId !== 'integration-policy') return null;

  const payload = data.currentState.payload as Record<string, unknown> | null;
  const detail = payload?.type ? String(payload.type) : 'integration policy';

  return <span className="hud-info-governance-detail">{detail}</span>;
}

function GovernanceSection({ organismId }: { organismId: string }) {
  const { data: children } = useChildren(organismId);

  const childIds = (children ?? []).slice(0, 20).map((c) => c.childId);

  if (childIds.length === 0) {
    return (
      <div className="hud-info-section">
        <span className="hud-info-label">Governance</span>
        <span className="hud-info-governance-status hud-info-governance-open">Open</span>
        <span className="hud-info-governance-detail">No policy organisms</span>
      </div>
    );
  }

  return (
    <div className="hud-info-section">
      <span className="hud-info-label">Governance</span>
      <GovernanceResolver childIds={childIds} />
    </div>
  );
}

function GovernanceResolver({ childIds }: { childIds: string[] }) {
  return (
    <>
      {childIds.map((id) => (
        <GovernanceChildCheck key={id} childId={id} />
      ))}
      <GovernanceFallback childIds={childIds} />
    </>
  );
}

function GovernanceFallback({ childIds }: { childIds: string[] }) {
  if (childIds.length > 0) {
    return null;
  }
  return (
    <>
      <span className="hud-info-governance-status hud-info-governance-open">Open</span>
      <span className="hud-info-governance-detail">No policy organisms</span>
    </>
  );
}

/* ── Main Component ── */

export function HudInteriorInfo({ organismId }: HudInteriorInfoProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showProposeForm, setShowProposeForm] = useState(false);

  const { data: organism } = useOrganism(organismId, refreshKey);

  const name = organism?.currentState ? getPreviewText(organism.currentState, 40) : '...';
  const contentType = organism?.currentState?.contentTypeId ?? '...';
  const openTrunk = organism?.organism.openTrunk ?? false;

  function handleProposed() {
    setRefreshKey((k) => k + 1);
    setShowProposeForm(false);
  }

  const proposeLabel = openTrunk ? 'Append State' : 'Open Proposal';

  return (
    <div className="hud-interior-info">
      <div className="hud-info-header">
        <span className="content-type">{contentType}</span>
        <h3 className="hud-info-name">{name}</h3>
      </div>

      {!showProposeForm && (
        <button type="button" className="hud-action-btn" onClick={() => setShowProposeForm(true)}>
          {proposeLabel}
        </button>
      )}

      {showProposeForm && organism?.currentState && (
        <ProposeForm
          organismId={organismId}
          currentContentTypeId={organism.currentState.contentTypeId}
          openTrunk={openTrunk}
          onComplete={handleProposed}
          onClose={() => setShowProposeForm(false)}
        />
      )}

      <VitalitySection organismId={organismId} refreshKey={refreshKey} />
      <CompositionSection organismId={organismId} refreshKey={refreshKey} />
      <ProposalsSection organismId={organismId} refreshKey={refreshKey} />
      <StateHistorySection organismId={organismId} refreshKey={refreshKey} />
      <GovernanceSection organismId={organismId} />
    </div>
  );
}
