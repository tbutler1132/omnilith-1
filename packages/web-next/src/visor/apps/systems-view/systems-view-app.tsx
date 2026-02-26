/**
 * Systems View app.
 *
 * Provides a read-only structural composition workspace for one targeted
 * organism with parent and direct-child boundary visibility.
 */

import { useEffect } from 'react';
import type { VisorAppRenderProps } from '../app-contract.js';
import styles from './systems-view-app.module.css';
import { resolveSystemsViewAppRouteState, type SystemsViewAppRouteState } from './systems-view-app-route.js';
import { presentSystemsViewStatus, presentSystemsViewStructure } from './systems-view-presenter.js';
import { useSystemsViewData } from './use-systems-view-data.js';

export function SystemsViewApp({
  onRequestClose,
  organismId,
  appRouteState,
  onChangeAppRouteState,
  onOpenApp,
}: VisorAppRenderProps<SystemsViewAppRouteState>) {
  void onRequestClose;

  const routeState = resolveSystemsViewAppRouteState(appRouteState, organismId);
  const { data, loading, error, sectionErrors } = useSystemsViewData(routeState.targetedOrganismId);

  const presentedStatus = presentSystemsViewStatus({
    loading,
    error,
    hasOrganism: Boolean(data?.organism),
  });

  const structure =
    presentedStatus.status === 'ready' && data
      ? presentSystemsViewStructure({
          organism: data.organism,
          currentState: data.currentState,
          parent: data.parent,
          children: data.children,
          selectedChildId: routeState.selectedChildId,
        })
      : null;

  useEffect(() => {
    if (!onChangeAppRouteState || !structure) {
      return;
    }

    if (routeState.selectedChildId && structure.selectedChildId !== routeState.selectedChildId) {
      onChangeAppRouteState({
        targetedOrganismId: routeState.targetedOrganismId,
        selectedChildId: structure.selectedChildId,
      });
    }
  }, [onChangeAppRouteState, routeState.selectedChildId, routeState.targetedOrganismId, structure]);

  const setRouteState = (nextState: SystemsViewAppRouteState) => {
    onChangeAppRouteState?.(nextState);
  };

  const handleSelectChild = (childId: string) => {
    setRouteState({
      targetedOrganismId: routeState.targetedOrganismId,
      selectedChildId: childId,
    });
  };

  const handleFocusChild = (childId: string) => {
    if (onOpenApp) {
      onOpenApp({
        appId: 'systems-view',
        organismId: childId,
        appRouteState: {
          targetedOrganismId: childId,
          selectedChildId: null,
        } satisfies SystemsViewAppRouteState,
      });
      return;
    }

    setRouteState({
      targetedOrganismId: childId,
      selectedChildId: null,
    });
  };

  return (
    <section className={styles.systemsViewApp}>
      <h2 className={styles.systemsViewTitle}>Systems View</h2>

      {data ? (
        <p className={styles.systemsViewTarget}>
          Targeting: <strong>{data.organism.name}</strong> ({data.organism.id})
        </p>
      ) : null}

      {presentedStatus.status !== 'ready' ? (
        <p className={styles.systemsViewStatus}>{presentedStatus.message}</p>
      ) : null}

      {presentedStatus.status === 'ready' && sectionErrors.composition ? (
        <p className={styles.systemsViewSectionError}>{sectionErrors.composition.message}</p>
      ) : null}

      {presentedStatus.status === 'ready' && structure ? (
        <>
          <dl className={styles.systemsViewMeta}>
            <div className={styles.systemsViewMetaRow}>
              <dt>Parent</dt>
              <dd>{structure.parentId ?? 'none'}</dd>
            </div>
            <div className={styles.systemsViewMetaRow}>
              <dt>Children</dt>
              <dd>{structure.childCount}</dd>
            </div>
            <div className={styles.systemsViewMetaRow}>
              <dt>Target content type</dt>
              <dd>{structure.targetNode.contentTypeId}</dd>
            </div>
          </dl>

          <div className={styles.systemsViewLanes}>
            {structure.parentId ? (
              <section className={styles.systemsViewLane}>
                <h3 className={styles.systemsViewLaneTitle}>Parent Boundary</h3>
                <article className={styles.systemsViewNodeCard}>
                  <p className={styles.systemsViewNodePrimary}>{structure.parentId}</p>
                  <p className={styles.systemsViewNodeSecondary}>contains target</p>
                </article>
              </section>
            ) : null}

            <section className={styles.systemsViewLane}>
              <h3 className={styles.systemsViewLaneTitle}>Target Boundary</h3>
              <article className={`${styles.systemsViewNodeCard} ${styles.systemsViewNodeCardTarget}`}>
                <p className={styles.systemsViewNodePrimary}>{structure.targetNode.name}</p>
                <p className={styles.systemsViewNodeSecondary}>{structure.targetNode.id}</p>
                <p className={styles.systemsViewNodeSecondary}>
                  {structure.targetNode.contentTypeId} · {structure.targetNode.openTrunk ? 'open-trunk' : 'regulated'}
                </p>
              </article>
            </section>

            <section className={styles.systemsViewLane}>
              <h3 className={styles.systemsViewLaneTitle}>Composed Children</h3>

              {structure.children.length === 0 ? (
                <p className={styles.systemsViewEmpty}>No composed children are inside this boundary yet.</p>
              ) : (
                <ul className={styles.systemsViewChildrenList}>
                  {structure.children.map((child) => (
                    <li key={child.id} className={styles.systemsViewChildItem}>
                      <article
                        className={`${styles.systemsViewNodeCard} ${child.isSelected ? styles.systemsViewNodeCardSelected : ''}`}
                      >
                        {child.isSelected ? <p className={styles.systemsViewSelectedTag}>Selected</p> : null}
                        <p className={styles.systemsViewNodePrimary}>{child.name}</p>
                        <p className={styles.systemsViewNodeSecondary}>{child.id}</p>
                        <p className={styles.systemsViewNodeSecondary}>
                          {child.contentTypeId} · {child.positionLabel} · {child.openTrunk ? 'open-trunk' : 'regulated'}
                        </p>

                        <div className={styles.systemsViewActions}>
                          <button
                            type="button"
                            className={styles.systemsViewActionButton}
                            onClick={() => handleSelectChild(child.id)}
                          >
                            Select child
                          </button>
                          <button
                            type="button"
                            className={styles.systemsViewActionButton}
                            onClick={() => handleFocusChild(child.id)}
                          >
                            Focus child
                          </button>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
