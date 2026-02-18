/**
 * HudMyProposalsPanel — map-level view of the current user's authored proposals.
 *
 * Groups proposals by open/integrated/declined status and caps each group
 * by default to keep the map panel readable.
 */

import { useMemo, useState } from 'react';
import { useUserProposals } from '../../../hooks/use-organism.js';
import { usePlatformStaticState } from '../../../platform/index.js';
import { PanelCardErrorWithAction, PanelCardLoading } from '../core/panel-ux.js';
import { formatDate } from '../organism/sections/format-date.js';
import { type ProposalStatus, presentMyProposals } from './my-proposals-presenter.js';

const GROUP_LIMIT = 10;

export function HudMyProposalsPanel() {
  const { canWrite } = usePlatformStaticState();
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Record<ProposalStatus, boolean>>({
    open: false,
    integrated: false,
    declined: false,
  });
  const { data: proposals, loading, error } = useUserProposals(refreshKey, canWrite);

  const groups = useMemo(() => presentMyProposals(proposals ?? [], { groupLimit: GROUP_LIMIT }), [proposals]);
  const total = proposals?.length ?? 0;

  function toggleExpanded(status: ProposalStatus) {
    setExpandedGroups((current) => ({ ...current, [status]: !current[status] }));
  }

  if (!canWrite) {
    return (
      <div className="hud-my-proposals-state">
        <h3>Proposals</h3>
        <p>Log in to view your authored proposals.</p>
      </div>
    );
  }

  if (loading) {
    return <PanelCardLoading title="Proposals" message="Loading authored proposals..." />;
  }

  if (error) {
    return (
      <PanelCardErrorWithAction
        title="Proposals"
        message="Could not load your authored proposals."
        actionLabel="Retry"
        onAction={() => setRefreshKey((v) => v + 1)}
      />
    );
  }

  return (
    <div className="hud-my-proposals">
      <header className="hud-my-proposals-header">
        <div>
          <h3>My proposals</h3>
          <p>Authored proposals grouped by status.</p>
        </div>
        <span className="hud-my-proposals-count">{total}</span>
      </header>

      {total === 0 ? (
        <div className="hud-my-proposals-state">
          <p>No authored proposals yet.</p>
        </div>
      ) : (
        <div className="hud-my-proposals-groups">
          {groups.map((group) => {
            const expanded = expandedGroups[group.status];
            const visibleProposals = expanded ? group.allProposals : group.proposals;

            return (
              <section key={group.status} className="hud-my-proposals-group">
                <header className="hud-my-proposals-group-header">
                  <h4>{group.label}</h4>
                  <span>{group.total}</span>
                </header>

                {visibleProposals.length === 0 ? (
                  <p className="hud-my-proposals-empty">No {group.label.toLowerCase()} proposals.</p>
                ) : (
                  <ul className="hud-my-proposals-list">
                    {visibleProposals.map((proposal) => (
                      <li key={proposal.id} className="hud-my-proposals-item">
                        <span className={`hud-info-proposal-status hud-info-proposal-status--${proposal.status}`}>
                          {proposal.status}
                        </span>
                        <span className="hud-info-proposal-detail">
                          {proposal.proposedContentTypeId} on {proposal.organismId.slice(0, 8)} ·{' '}
                          {formatDate(proposal.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {(group.hasMore || expanded) && (
                  <button type="button" className="hud-action-btn" onClick={() => toggleExpanded(group.status)}>
                    {expanded ? 'Show less' : `Show all (${group.total})`}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
