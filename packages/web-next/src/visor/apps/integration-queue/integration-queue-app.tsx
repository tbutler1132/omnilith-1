/**
 * Integration Queue app.
 *
 * Provides an action-capable queue for proposal integration work on the
 * currently targeted organism.
 */

import type { Proposal } from '@omnilith/api-contracts';
import { useEffect, useState } from 'react';
import type { VisorAppRenderProps } from '../app-contract.js';
import { ProposalWorkbenchCompare } from '../proposal-workbench/proposal-workbench-compare.js';
import styles from './integration-queue-app.module.css';
import {
  type IntegrationQueueAppRouteState,
  type IntegrationQueueAppTabId,
  type IntegrationQueueStatusFilter,
  resolveIntegrationQueueAppRouteState,
} from './integration-queue-app-route.js';
import {
  formatTimestamp,
  presentIntegrationQueueList,
  presentIntegrationQueueStatus,
  presentMutationSummary,
  resolveNextOpenProposalId,
  resolveProposalCompare,
} from './integration-queue-presenter.js';
import { declineQueueProposal, integrateQueueProposal } from './integration-queue-write.js';
import { useIntegrationQueueData } from './use-integration-queue-data.js';

const QUEUE_TABS: ReadonlyArray<{ id: IntegrationQueueAppTabId; label: string }> = [
  { id: 'queue', label: 'Queue' },
  { id: 'detail', label: 'Detail' },
];

const STATUS_FILTERS: ReadonlyArray<{ id: IntegrationQueueStatusFilter; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'all', label: 'All' },
];

type QueueActionKind = 'integrate' | 'decline';

export function IntegrationQueueApp({
  onRequestClose,
  organismId,
  appRouteState,
  onChangeAppRouteState,
}: VisorAppRenderProps<IntegrationQueueAppRouteState>) {
  void onRequestClose;

  const routeState = resolveIntegrationQueueAppRouteState(appRouteState, organismId);
  const { data, loading, error, sectionErrors } = useIntegrationQueueData(routeState.targetedOrganismId);

  const [proposalOverrides, setProposalOverrides] = useState<ReadonlyArray<Proposal> | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<QueueActionKind | null>(null);
  const [pendingAction, setPendingAction] = useState<QueueActionKind | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setProposalOverrides(null);
      setConfirmationAction(null);
      setPendingAction(null);
      setActionError(null);
      return;
    }

    // Data replaced: clear local write overrides so fresh queue state is shown.
    setProposalOverrides(null);
    setConfirmationAction(null);
    setPendingAction(null);
    setActionError(null);
  }, [data]);

  const proposals = proposalOverrides ?? data?.proposals ?? [];

  const presentedStatus = presentIntegrationQueueStatus({
    loading,
    error,
    hasOrganism: Boolean(data?.organism),
  });

  const list = presentIntegrationQueueList({
    proposals,
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
        tab: 'queue',
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

  const setRouteState = (nextState: IntegrationQueueAppRouteState) => {
    onChangeAppRouteState?.(nextState);
  };

  const handleSelectTab = (tab: IntegrationQueueAppTabId) => {
    setActionError(null);
    setConfirmationAction(null);
    setRouteState({
      ...routeState,
      tab,
    });
  };

  const handleSelectStatusFilter = (statusFilter: IntegrationQueueStatusFilter) => {
    setActionError(null);
    setConfirmationAction(null);
    setRouteState({
      ...routeState,
      statusFilter,
      tab: 'queue',
      selectedProposalId: null,
    });
  };

  const handleSelectProposal = (proposalId: string) => {
    setActionError(null);
    setConfirmationAction(null);
    setRouteState({
      ...routeState,
      tab: 'detail',
      selectedProposalId: proposalId,
    });
  };

  const activeProposal = selectedEntry?.proposal ?? null;
  const isActionableProposal = activeProposal?.status === 'open';

  const executeAction = async (kind: QueueActionKind, proposalId: string) => {
    setPendingAction(kind);
    setActionError(null);

    try {
      const response =
        kind === 'integrate' ? await integrateQueueProposal(proposalId) : await declineQueueProposal(proposalId);
      const updatedProposal = response.proposal;
      const nextProposals = proposals.map((proposal) =>
        proposal.id === updatedProposal.id ? updatedProposal : proposal,
      );
      const nextOpenProposalId = resolveNextOpenProposalId({ proposals: nextProposals });

      setProposalOverrides(nextProposals);
      if (nextOpenProposalId) {
        setRouteState({
          ...routeState,
          tab: 'detail',
          selectedProposalId: nextOpenProposalId,
        });
      } else {
        setRouteState({
          ...routeState,
          tab: 'queue',
          selectedProposalId: null,
        });
      }

      setConfirmationAction(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Failed to update proposal status.';
      setActionError(message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleActionClick = (kind: QueueActionKind) => {
    if (!activeProposal || !isActionableProposal || pendingAction) {
      return;
    }

    setActionError(null);

    if (confirmationAction !== kind) {
      setConfirmationAction(kind);
      return;
    }

    void executeAction(kind, activeProposal.id);
  };

  return (
    <section className={styles.integrationQueueApp}>
      <h2 className={styles.integrationQueueTitle}>Integration Queue</h2>

      {data ? (
        <p className={styles.integrationQueueTarget}>
          Targeting: <strong>{data.organism.name}</strong> ({data.organism.id})
        </p>
      ) : null}

      <div className={styles.integrationQueueControls} role="tablist" aria-label="Integration queue tabs">
        {QUEUE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === routeState.tab}
            className={`${styles.integrationQueueTabButton} ${tab.id === routeState.tab ? styles.integrationQueueTabButtonActive : ''}`}
            onClick={() => handleSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <fieldset className={styles.integrationQueueControls}>
        <legend className={styles.integrationQueueLegend}>Proposal status filter</legend>
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`${styles.integrationQueueFilterButton} ${filter.id === routeState.statusFilter ? styles.integrationQueueFilterButtonActive : ''}`}
            onClick={() => handleSelectStatusFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
        <p className={styles.integrationQueueCount}>
          Open {list.openCount} · Total {list.totalCount}
        </p>
      </fieldset>

      {presentedStatus.status !== 'ready' ? (
        <p className={styles.integrationQueueStatus}>{presentedStatus.message}</p>
      ) : null}

      {presentedStatus.status === 'ready' && sectionErrors.proposals ? (
        <p className={styles.integrationQueueSectionError}>{sectionErrors.proposals.message}</p>
      ) : null}

      {presentedStatus.status === 'ready' && routeState.tab === 'queue' ? (
        list.entries.length === 0 ? (
          <p className={styles.integrationQueueEmpty}>No proposals match this filter for the targeted organism.</p>
        ) : (
          <ul className={styles.integrationQueueList}>
            {list.entries.map((entry) => (
              <li key={entry.id} className={styles.integrationQueueListItem}>
                <button
                  type="button"
                  className={styles.integrationQueueListButton}
                  onClick={() => handleSelectProposal(entry.id)}
                >
                  <span className={styles.integrationQueueStatusBadge} data-status={entry.status}>
                    {entry.status}
                  </span>
                  <span className={styles.integrationQueueSecondary}>{entry.id}</span>
                  <span className={styles.integrationQueuePrimary}>{entry.summary}</span>
                  <span className={styles.integrationQueueSecondary}>{entry.createdAtLabel}</span>
                  <span className={styles.integrationQueueSecondary}>Proposed by {entry.proposedBy}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {presentedStatus.status === 'ready' && routeState.tab === 'detail' ? (
        activeProposal ? (
          <section className={styles.integrationQueuePanel}>
            <button
              type="button"
              className={styles.integrationQueueActionButton}
              onClick={() => handleSelectTab('queue')}
            >
              Back to queue
            </button>

            <dl className={styles.integrationQueueMeta}>
              <div className={styles.integrationQueueMetaRow}>
                <dt>Proposal</dt>
                <dd>{activeProposal.id}</dd>
              </div>
              <div className={styles.integrationQueueMetaRow}>
                <dt>Status</dt>
                <dd>{activeProposal.status}</dd>
              </div>
              <div className={styles.integrationQueueMetaRow}>
                <dt>Mutation</dt>
                <dd>{presentMutationSummary(activeProposal)}</dd>
              </div>
              <div className={styles.integrationQueueMetaRow}>
                <dt>Proposed by</dt>
                <dd>{activeProposal.proposedBy}</dd>
              </div>
              <div className={styles.integrationQueueMetaRow}>
                <dt>Created</dt>
                <dd>{formatTimestamp(activeProposal.createdAt)}</dd>
              </div>
              <div className={styles.integrationQueueMetaRow}>
                <dt>Resolved</dt>
                <dd>{activeProposal.resolvedAt ? formatTimestamp(activeProposal.resolvedAt) : 'Unresolved'}</dd>
              </div>
            </dl>

            {isActionableProposal ? (
              <div className={styles.integrationQueueDecisionRow}>
                <button
                  type="button"
                  className={styles.integrationQueueActionButton}
                  onClick={() => handleActionClick('integrate')}
                  disabled={pendingAction !== null}
                >
                  {pendingAction === 'integrate'
                    ? 'Integrating...'
                    : confirmationAction === 'integrate'
                      ? 'Confirm integrate'
                      : 'Integrate'}
                </button>
                <button
                  type="button"
                  className={styles.integrationQueueActionButton}
                  onClick={() => handleActionClick('decline')}
                  disabled={pendingAction !== null}
                >
                  {pendingAction === 'decline'
                    ? 'Declining...'
                    : confirmationAction === 'decline'
                      ? 'Confirm decline'
                      : 'Decline'}
                </button>
                {confirmationAction ? (
                  <button
                    type="button"
                    className={styles.integrationQueueActionButton}
                    onClick={() => setConfirmationAction(null)}
                    disabled={pendingAction !== null}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            ) : (
              <p className={styles.integrationQueueHint}>Resolved proposals are read-only in the integration queue.</p>
            )}

            {confirmationAction ? (
              <p className={styles.integrationQueueHint}>Click {confirmationAction} again to confirm this decision.</p>
            ) : null}
            {actionError ? <p className={styles.integrationQueueSectionError}>{actionError}</p> : null}

            <ProposalWorkbenchCompare
              {...resolveProposalCompare({
                proposal: activeProposal,
                currentStatePayload: data?.currentState?.payload,
                currentStateContentTypeId: data?.currentState?.contentTypeId ?? null,
              })}
            />
          </section>
        ) : (
          <p className={styles.integrationQueueHint}>Select a proposal in the queue to inspect and decide.</p>
        )
      ) : null}
    </section>
  );
}
