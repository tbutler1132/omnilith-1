/**
 * Proposal Workbench app.
 *
 * Provides a read-only proposal review surface for the currently targeted
 * organism with status filtering and before/proposed comparison.
 */

import { useEffect } from 'react';
import type { VisorAppRenderProps } from '../app-contract.js';
import styles from './proposal-workbench-app.module.css';
import {
  type ProposalWorkbenchAppRouteState,
  type ProposalWorkbenchAppTabId,
  type ProposalWorkbenchStatusFilter,
  resolveProposalWorkbenchAppRouteState,
} from './proposal-workbench-app-route.js';
import { ProposalWorkbenchCompare } from './proposal-workbench-compare.js';
import {
  formatTimestamp,
  presentMutationSummary,
  presentProposalList,
  presentProposalWorkbenchStatus,
  resolveProposalCompare,
} from './proposal-workbench-presenter.js';
import { useProposalWorkbenchData } from './use-proposal-workbench-data.js';

const WORKBENCH_TABS: ReadonlyArray<{ id: ProposalWorkbenchAppTabId; label: string }> = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'detail', label: 'Detail' },
];

const STATUS_FILTERS: ReadonlyArray<{ id: ProposalWorkbenchStatusFilter; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'all', label: 'All' },
];

export function ProposalWorkbenchApp({
  onRequestClose,
  organismId,
  appRouteState,
  onChangeAppRouteState,
}: VisorAppRenderProps<ProposalWorkbenchAppRouteState>) {
  void onRequestClose;

  const routeState = resolveProposalWorkbenchAppRouteState(appRouteState, organismId);
  const { data, loading, error, sectionErrors } = useProposalWorkbenchData(routeState.targetedOrganismId);

  const presentedStatus = presentProposalWorkbenchStatus({
    loading,
    error,
    hasOrganism: Boolean(data?.organism),
  });

  const list = presentProposalList({
    proposals: data?.proposals ?? [],
    statusFilter: routeState.statusFilter,
  });

  const selectedEntry = routeState.selectedProposalId
    ? (list.entries.find((entry) => entry.id === routeState.selectedProposalId) ?? null)
    : (list.entries[0] ?? null);

  useEffect(() => {
    if (!onChangeAppRouteState) {
      return;
    }

    if (presentedStatus.status !== 'ready') {
      return;
    }

    if (list.entries.length === 0 && routeState.selectedProposalId !== null) {
      onChangeAppRouteState({
        ...routeState,
        selectedProposalId: null,
        tab: 'inbox',
      });
      return;
    }

    if (list.entries.length > 0 && selectedEntry === null) {
      onChangeAppRouteState({
        ...routeState,
        selectedProposalId: list.entries[0]?.id ?? null,
      });
    }
  }, [list.entries, onChangeAppRouteState, presentedStatus.status, routeState, selectedEntry]);

  const setRouteState = (nextState: ProposalWorkbenchAppRouteState) => {
    onChangeAppRouteState?.(nextState);
  };

  const handleSelectTab = (tab: ProposalWorkbenchAppTabId) => {
    setRouteState({
      ...routeState,
      tab,
    });
  };

  const handleSelectStatusFilter = (statusFilter: ProposalWorkbenchStatusFilter) => {
    setRouteState({
      ...routeState,
      statusFilter,
      tab: 'inbox',
      selectedProposalId: null,
    });
  };

  const handleSelectProposal = (proposalId: string) => {
    setRouteState({
      ...routeState,
      tab: 'detail',
      selectedProposalId: proposalId,
    });
  };

  const activeProposal = selectedEntry?.proposal ?? null;

  return (
    <section className={styles.proposalWorkbenchApp}>
      <h2 className={styles.proposalWorkbenchTitle}>Proposal Workbench</h2>

      {data ? (
        <p className={styles.proposalWorkbenchTarget}>
          Looking at: <strong>{data.organism.name}</strong> ({data.organism.id})
        </p>
      ) : null}

      <div className={styles.proposalWorkbenchControls} role="tablist" aria-label="Proposal workbench tabs">
        {WORKBENCH_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === routeState.tab}
            className={`${styles.proposalWorkbenchTabButton} ${tab.id === routeState.tab ? styles.proposalWorkbenchTabButtonActive : ''}`}
            onClick={() => handleSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <fieldset className={styles.proposalWorkbenchControls}>
        <legend className={styles.proposalWorkbenchLegend}>Proposal status filter</legend>
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`${styles.proposalWorkbenchFilterButton} ${filter.id === routeState.statusFilter ? styles.proposalWorkbenchFilterButtonActive : ''}`}
            onClick={() => handleSelectStatusFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
        <p className={styles.proposalWorkbenchCount}>
          Open {list.openCount} · Total {list.totalCount}
        </p>
      </fieldset>

      {presentedStatus.status !== 'ready' ? (
        <p className={styles.proposalWorkbenchStatus}>{presentedStatus.message}</p>
      ) : null}

      {presentedStatus.status === 'ready' && sectionErrors.proposals ? (
        <p className={styles.proposalWorkbenchSectionError}>{sectionErrors.proposals.message}</p>
      ) : null}

      {presentedStatus.status === 'ready' && routeState.tab === 'inbox' ? (
        list.entries.length === 0 ? (
          <p className={styles.proposalWorkbenchEmpty}>No proposals match this filter for the targeted organism.</p>
        ) : (
          <ul className={styles.proposalWorkbenchList}>
            {list.entries.map((entry) => (
              <li key={entry.id} className={styles.proposalWorkbenchListItem}>
                <button
                  type="button"
                  className={styles.proposalWorkbenchListButton}
                  onClick={() => handleSelectProposal(entry.id)}
                >
                  <span className={styles.proposalWorkbenchStatusBadge} data-status={entry.status}>
                    {entry.status}
                  </span>
                  <span className={styles.proposalWorkbenchSecondary}>{entry.id}</span>
                  <span className={styles.proposalWorkbenchPrimary}>{entry.summary}</span>
                  <span className={styles.proposalWorkbenchSecondary}>{entry.createdAtLabel}</span>
                  <span className={styles.proposalWorkbenchSecondary}>Proposed by {entry.proposedBy}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {presentedStatus.status === 'ready' && routeState.tab === 'detail' ? (
        activeProposal ? (
          <section className={styles.proposalWorkbenchPanel}>
            <button
              type="button"
              className={styles.proposalWorkbenchActionButton}
              onClick={() => handleSelectTab('inbox')}
            >
              Back to inbox
            </button>

            <dl className={styles.proposalWorkbenchMeta}>
              <div className={styles.proposalWorkbenchMetaRow}>
                <dt>Proposal</dt>
                <dd>{activeProposal.id}</dd>
              </div>
              <div className={styles.proposalWorkbenchMetaRow}>
                <dt>Status</dt>
                <dd>{activeProposal.status}</dd>
              </div>
              <div className={styles.proposalWorkbenchMetaRow}>
                <dt>Mutation</dt>
                <dd>{presentMutationSummary(activeProposal)}</dd>
              </div>
              <div className={styles.proposalWorkbenchMetaRow}>
                <dt>Proposed by</dt>
                <dd>{activeProposal.proposedBy}</dd>
              </div>
              <div className={styles.proposalWorkbenchMetaRow}>
                <dt>Created</dt>
                <dd>{formatTimestamp(activeProposal.createdAt)}</dd>
              </div>
              <div className={styles.proposalWorkbenchMetaRow}>
                <dt>Resolved</dt>
                <dd>{activeProposal.resolvedAt ? formatTimestamp(activeProposal.resolvedAt) : 'Unresolved'}</dd>
              </div>
            </dl>

            <ProposalWorkbenchCompare
              {...resolveProposalCompare({
                proposal: activeProposal,
                currentStatePayload: data?.currentState?.payload,
                currentStateContentTypeId: data?.currentState?.contentTypeId ?? null,
              })}
            />
          </section>
        ) : (
          <p className={styles.proposalWorkbenchHint}>Select a proposal in inbox to inspect its comparison details.</p>
        )
      ) : null}
    </section>
  );
}
