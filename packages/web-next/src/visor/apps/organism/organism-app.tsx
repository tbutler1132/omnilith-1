/**
 * Organism app.
 *
 * Shows one organism overview and a user-scoped "My organisms" list while
 * keeping app-local navigation in the app route codec.
 */

import type { VisorAppRenderProps } from '../app-contract.js';
import styles from './organism-app.module.css';
import {
  type OrganismAppRouteState,
  type OrganismAppTabId,
  resolveOrganismAppRouteState,
} from './organism-app-route.js';
import { presentOrganismOverview } from './organism-overview-presenter.js';
import { OrganismWireframePreview } from './organism-wireframe-preview.js';
import { useMyOrganisms } from './use-my-organisms.js';
import { useOrganismOverview } from './use-organism-overview.js';

const ORGANISM_APP_TABS: ReadonlyArray<{ id: OrganismAppTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'my-organisms', label: 'My organisms' },
];

export function OrganismApp({
  onRequestClose,
  organismId,
  appRouteState,
  onChangeAppRouteState,
  onOpenApp,
}: VisorAppRenderProps<OrganismAppRouteState>) {
  void onRequestClose;

  const routeState = resolveOrganismAppRouteState(appRouteState, organismId);
  const activeTabId = routeState.tab;
  const targetedOrganismId = routeState.targetedOrganismId ?? organismId;
  const { data, loading, error } = useOrganismOverview(targetedOrganismId);
  const {
    organisms,
    loading: myOrganismsLoading,
    error: myOrganismsError,
    requiresSignIn,
  } = useMyOrganisms(activeTabId === 'my-organisms');
  const contentTypeId = data?.currentState?.contentTypeId ?? null;
  const presented = presentOrganismOverview({
    organismLoading: loading,
    organismError: error ?? undefined,
    hasCurrentState: Boolean(data?.currentState),
    payload: data?.currentState?.payload,
  });
  const canNavigateToOrganism = typeof onChangeAppRouteState === 'function' || typeof onOpenApp === 'function';

  const setRouteState = (nextState: OrganismAppRouteState) => {
    onChangeAppRouteState?.(nextState);
  };

  const handleSelectTab = (tab: OrganismAppTabId) => {
    setRouteState({
      tab,
      targetedOrganismId,
    });
  };

  const handleOpenOrganism = (nextOrganismId: string) => {
    if (onOpenApp) {
      onOpenApp({
        appId: 'organism',
        organismId: nextOrganismId,
        appRouteState: {
          tab: 'overview',
          targetedOrganismId: nextOrganismId,
        } satisfies OrganismAppRouteState,
      });
      return;
    }

    setRouteState({
      tab: 'overview',
      targetedOrganismId: nextOrganismId,
    });
  };

  return (
    <section className={styles.organismApp}>
      <h2 className={styles.organismAppTitle}>Organism</h2>

      <div className={styles.organismAppTabRow} role="tablist" aria-label="Organism app tabs">
        {ORGANISM_APP_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTabId}
            className={`${styles.organismAppTabButton} ${tab.id === activeTabId ? styles.organismAppTabButtonActive : ''}`}
            onClick={() => handleSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTabId === 'overview' ? (
        <>
          {data ? (
            <dl className={styles.organismOverviewMeta}>
              <div className={styles.organismOverviewMetaRow}>
                <dt>ID</dt>
                <dd>{data.organism.id}</dd>
              </div>
              <div className={styles.organismOverviewMetaRow}>
                <dt>Name</dt>
                <dd>{data.organism.name}</dd>
              </div>
              <div className={styles.organismOverviewMetaRow}>
                <dt>Content Type</dt>
                <dd>{data.currentState?.contentTypeId ?? 'none'}</dd>
              </div>
            </dl>
          ) : null}

          {presented.status !== 'ready' ? <p className={styles.organismOverviewStatus}>{presented.message}</p> : null}

          {presented.status === 'ready' ? (
            <>
              <OrganismWireframePreview contentTypeId={contentTypeId} />
              <pre className={styles.organismOverviewPayload}>{presented.rawPayload}</pre>
            </>
          ) : null}
        </>
      ) : null}

      {activeTabId === 'my-organisms' ? (
        <>
          {requiresSignIn ? <p className={styles.organismAppStatus}>Sign in to view your organisms.</p> : null}
          {!requiresSignIn && myOrganismsLoading ? (
            <p className={styles.organismAppStatus}>Loading your organisms...</p>
          ) : null}
          {!requiresSignIn && myOrganismsError ? (
            <p className={styles.organismAppStatus}>Failed to load your organisms.</p>
          ) : null}
          {!requiresSignIn && !myOrganismsLoading && !myOrganismsError && organisms.length === 0 ? (
            <p className={styles.organismAppEmpty}>You have not introduced any organisms yet.</p>
          ) : null}

          {!requiresSignIn && !myOrganismsLoading && !myOrganismsError && organisms.length > 0 ? (
            <ul className={styles.organismAppList}>
              {organisms.map((entry) => (
                <li key={entry.id} className={styles.organismAppListItem}>
                  <button
                    type="button"
                    className={`${styles.organismAppOpenButton} ${
                      entry.id === targetedOrganismId ? styles.organismAppOpenButtonActive : ''
                    }`}
                    disabled={!canNavigateToOrganism}
                    onClick={() => handleOpenOrganism(entry.id)}
                  >
                    <span className={styles.organismAppOpenButtonName}>{entry.name}</span>
                    <span className={styles.organismAppOpenButtonMeta}>
                      {entry.contentTypeId ?? 'none'} · {entry.id}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
