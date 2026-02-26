/**
 * Organism View app.
 *
 * Provides a read-only universal layer for one organism: current state,
 * state history, composition, and governance signals.
 */

import { useEffect, useMemo, useState } from 'react';
import type { VisorAppRenderProps } from '../app-contract.js';
import styles from './organism-view-app.module.css';
import {
  type OrganismViewAppRouteState,
  type OrganismViewAppTabId,
  resolveOrganismViewAppRouteState,
} from './organism-view-app-route.js';
import {
  formatTimestamp,
  presentOrganismViewStatus,
  presentStateHistory,
  stringifyPayload,
} from './organism-view-presenter.js';
import { useOrganismViewData } from './use-organism-view-data.js';

const HISTORY_PAGE_SIZE = 20;

const ORGANISM_VIEW_TABS: ReadonlyArray<{ id: OrganismViewAppTabId; label: string }> = [
  { id: 'state', label: 'State' },
  { id: 'state-history', label: 'State history' },
  { id: 'composition', label: 'Composition' },
  { id: 'governance', label: 'Governance' },
];

export function OrganismViewApp({
  onRequestClose,
  organismId,
  appRouteState,
  onChangeAppRouteState,
  onOpenApp,
}: VisorAppRenderProps<OrganismViewAppRouteState>) {
  void onRequestClose;

  const routeState = resolveOrganismViewAppRouteState(appRouteState, organismId);
  const activeTabId = routeState.tab;
  const targetedOrganismId = routeState.targetedOrganismId;
  const { data, loading, error, sectionErrors } = useOrganismViewData(targetedOrganismId);
  const [historyVisibleCount, setHistoryVisibleCount] = useState(HISTORY_PAGE_SIZE);

  const presentedStatus = presentOrganismViewStatus({
    loading,
    error,
    hasOrganism: Boolean(data?.organism),
  });

  const presentedHistory = useMemo(
    () =>
      presentStateHistory({
        states: data?.stateHistory ?? [],
        visibleCount: historyVisibleCount,
      }),
    [data?.stateHistory, historyVisibleCount],
  );

  useEffect(() => {
    setHistoryVisibleCount(HISTORY_PAGE_SIZE);
  }, []);

  const updateRouteState = (nextState: OrganismViewAppRouteState) => {
    onChangeAppRouteState?.(nextState);
  };

  const handleSelectTab = (tab: OrganismViewAppTabId) => {
    updateRouteState({
      tab,
      targetedOrganismId,
    });
  };

  const handleOpenChild = (childOrganismId: string) => {
    if (onOpenApp) {
      onOpenApp({
        appId: 'organism-view',
        organismId: childOrganismId,
        appRouteState: {
          tab: 'state',
          targetedOrganismId: childOrganismId,
        } satisfies OrganismViewAppRouteState,
      });
      return;
    }

    updateRouteState({
      tab: 'state',
      targetedOrganismId: childOrganismId,
    });
  };

  return (
    <section className={styles.organismViewApp}>
      <h2 className={styles.organismViewTitle}>Organism View</h2>

      {data ? (
        <p className={styles.organismViewTarget}>
          Looking at: <strong>{data.organism.name}</strong> ({data.organism.id})
        </p>
      ) : null}

      <div className={styles.organismViewTabRow} role="tablist" aria-label="Organism view tabs">
        {ORGANISM_VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTabId}
            className={`${styles.organismViewTabButton} ${tab.id === activeTabId ? styles.organismViewTabButtonActive : ''}`}
            onClick={() => handleSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {presentedStatus.status !== 'ready' ? (
        <p className={styles.organismViewStatus}>{presentedStatus.message}</p>
      ) : null}

      {presentedStatus.status === 'ready' && data && activeTabId === 'state' ? (
        <>
          <dl className={styles.organismViewMeta}>
            <div className={styles.organismViewMetaRow}>
              <dt>ID</dt>
              <dd>{data.organism.id}</dd>
            </div>
            <div className={styles.organismViewMetaRow}>
              <dt>Name</dt>
              <dd>{data.organism.name}</dd>
            </div>
            <div className={styles.organismViewMetaRow}>
              <dt>Content Type</dt>
              <dd>{data.currentState?.contentTypeId ?? 'none'}</dd>
            </div>
            <div className={styles.organismViewMetaRow}>
              <dt>Open-trunk</dt>
              <dd>{data.organism.openTrunk ? 'enabled' : 'disabled'}</dd>
            </div>
          </dl>

          {data.currentState ? (
            <pre className={styles.organismViewPayload}>{stringifyPayload(data.currentState.payload)}</pre>
          ) : (
            <p className={styles.organismViewEmpty}>No current state payload to display.</p>
          )}
        </>
      ) : null}

      {presentedStatus.status === 'ready' && data && activeTabId === 'state-history' ? (
        <>
          {sectionErrors.stateHistory ? (
            <p className={styles.organismViewSectionError}>{sectionErrors.stateHistory.message}</p>
          ) : null}

          {presentedHistory.entries.length === 0 ? (
            <p className={styles.organismViewEmpty}>No state history is available yet.</p>
          ) : (
            <ul className={styles.organismViewHistoryList}>
              {presentedHistory.entries.map((entry) => (
                <li key={`state-history-${entry.sequenceNumber}`} className={styles.organismViewHistoryItem}>
                  <p className={styles.organismViewHistoryLinePrimary}>
                    #{entry.sequenceNumber} · {entry.contentTypeId}
                  </p>
                  <p className={styles.organismViewHistoryLineSecondary}>{entry.createdAtLabel}</p>
                  <p className={styles.organismViewHistoryLineSecondary}>{entry.payloadPreview}</p>
                </li>
              ))}
            </ul>
          )}

          {presentedHistory.hasMore ? (
            <button
              type="button"
              className={styles.organismViewActionButton}
              onClick={() => setHistoryVisibleCount((count) => count + HISTORY_PAGE_SIZE)}
            >
              Load more state history
            </button>
          ) : null}
        </>
      ) : null}

      {presentedStatus.status === 'ready' && data && activeTabId === 'composition' ? (
        <>
          {sectionErrors.composition ? (
            <p className={styles.organismViewSectionError}>{sectionErrors.composition.message}</p>
          ) : null}

          <div className={styles.organismViewPanel}>
            <dl className={styles.organismViewMeta}>
              <div className={styles.organismViewMetaRow}>
                <dt>Parent</dt>
                <dd>{data.parent?.parentId ?? 'none'}</dd>
              </div>
              <div className={styles.organismViewMetaRow}>
                <dt>Children</dt>
                <dd>{data.children.length}</dd>
              </div>
            </dl>
          </div>

          {data.children.length === 0 ? (
            <p className={styles.organismViewEmpty}>No composed children are inside this boundary.</p>
          ) : (
            <ul className={styles.organismViewChildrenList}>
              {data.children.map((child) => (
                <li key={child.composition.childId} className={styles.organismViewChildItem}>
                  <p className={styles.organismViewChildName}>{child.organism.name}</p>
                  <p className={styles.organismViewChildMeta}>
                    {child.organism.id} · {child.currentState?.contentTypeId ?? 'none'} · position{' '}
                    {child.composition.position ?? 'none'}
                  </p>
                  <button
                    type="button"
                    className={styles.organismViewActionButton}
                    onClick={() => handleOpenChild(child.organism.id)}
                  >
                    Open child
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      {presentedStatus.status === 'ready' && data && activeTabId === 'governance' ? (
        <>
          {sectionErrors.governance ? (
            <p className={styles.organismViewSectionError}>{sectionErrors.governance.message}</p>
          ) : null}

          <dl className={styles.organismViewMeta}>
            <div className={styles.organismViewMetaRow}>
              <dt>Open-trunk</dt>
              <dd>{data.organism.openTrunk ? 'enabled' : 'disabled'}</dd>
            </div>
            <div className={styles.organismViewMetaRow}>
              <dt>Visibility</dt>
              <dd>{data.visibility?.level ?? 'unknown'}</dd>
            </div>
            <div className={styles.organismViewMetaRow}>
              <dt>Open proposals</dt>
              <dd>{data.proposalCount ?? 'unknown'}</dd>
            </div>
            <div className={styles.organismViewMetaRow}>
              <dt>Current state time</dt>
              <dd>
                {data.stateHistory.length > 0
                  ? formatTimestamp(data.stateHistory[data.stateHistory.length - 1]?.createdAt)
                  : 'Unknown time'}
              </dd>
            </div>
          </dl>
        </>
      ) : null}
    </section>
  );
}
