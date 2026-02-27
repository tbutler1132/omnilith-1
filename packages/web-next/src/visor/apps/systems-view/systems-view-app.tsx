/**
 * Systems View app.
 *
 * Provides a structural composition workspace for one targeted organism,
 * including create-and-compose flow for thresholding new text children.
 */

import { useEffect, useState } from 'react';
import { ApiError } from '../../../api/api-client.js';
import type { VisorAppRenderProps } from '../app-contract.js';
import styles from './systems-view-app.module.css';
import { resolveSystemsViewAppRouteState, type SystemsViewAppRouteState } from './systems-view-app-route.js';
import { presentSystemsViewStatus, presentSystemsViewStructure } from './systems-view-presenter.js';
import { composeSystemsChild, type SystemsViewTextFormat, thresholdTextSystemsOrganism } from './systems-view-write.js';
import { useSystemsViewData } from './use-systems-view-data.js';

const DEFAULT_CREATE_FORMAT: SystemsViewTextFormat = 'markdown';

export function SystemsViewApp({
  onRequestClose,
  organismId,
  appRouteState,
  onChangeAppRouteState,
  onOpenApp,
}: VisorAppRenderProps<SystemsViewAppRouteState>) {
  void onRequestClose;

  const routeState = resolveSystemsViewAppRouteState(appRouteState, organismId);
  const { data, loading, error, sectionErrors, reload } = useSystemsViewData(routeState.targetedOrganismId);
  const [draftName, setDraftName] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftFormat, setDraftFormat] = useState<SystemsViewTextFormat>(DEFAULT_CREATE_FORMAT);
  const [draftOpenTrunk, setDraftOpenTrunk] = useState(true);
  const [createComposePending, setCreateComposePending] = useState(false);
  const [createComposeNotice, setCreateComposeNotice] = useState<string | null>(null);
  const [createComposeError, setCreateComposeError] = useState<string | null>(null);

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

  useEffect(() => {
    void routeState.targetedOrganismId;
    setCreateComposePending(false);
    setCreateComposeNotice(null);
    setCreateComposeError(null);
  }, [routeState.targetedOrganismId]);

  const canComposeInBoundary = data?.canCompose ?? false;
  const canSubmitCreateCompose =
    presentedStatus.status === 'ready' &&
    Boolean(data) &&
    canComposeInBoundary &&
    draftName.trim().length > 0 &&
    draftContent.trim().length > 0 &&
    !createComposePending;

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

  const handleCreateAndCompose = async () => {
    if (!data) {
      return;
    }

    if (!data.canCompose) {
      setCreateComposeError(
        data.composeDeniedReason ?? 'You do not currently have composition authority in this boundary.',
      );
      setCreateComposeNotice(null);
      return;
    }

    if (!canSubmitCreateCompose) {
      return;
    }

    setCreateComposePending(true);
    setCreateComposeNotice(null);
    setCreateComposeError(null);

    let createdChildId: string | null = null;

    try {
      const thresholdResult = await thresholdTextSystemsOrganism({
        name: draftName.trim(),
        content: draftContent,
        format: draftFormat,
        openTrunk: draftOpenTrunk,
      });
      createdChildId = thresholdResult.organism.id;

      await composeSystemsChild({
        parentOrganismId: data.targetOrganismId,
        childId: createdChildId,
      });

      setDraftName('');
      setDraftContent('');
      setDraftFormat(DEFAULT_CREATE_FORMAT);
      setDraftOpenTrunk(true);
      setCreateComposeNotice(`Thresholded and composed ${thresholdResult.organism.name} (${createdChildId}).`);
      setCreateComposeError(null);

      setRouteState({
        targetedOrganismId: data.targetOrganismId,
        selectedChildId: createdChildId,
      });
      reload();
    } catch (nextError) {
      setCreateComposeNotice(null);
      setCreateComposeError(resolveCreateComposeError(nextError, createdChildId));
    } finally {
      setCreateComposePending(false);
    }
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
      {presentedStatus.status === 'ready' && data && !data.canCompose ? (
        <p className={styles.systemsViewSectionError}>
          {data.composeDeniedReason ?? 'You do not currently have composition authority in this boundary.'}
        </p>
      ) : null}
      {createComposeNotice ? <p className={styles.systemsViewStatus}>{createComposeNotice}</p> : null}
      {createComposeError ? <p className={styles.systemsViewSectionError}>{createComposeError}</p> : null}

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

            <section className={styles.systemsViewLane}>
              <h3 className={styles.systemsViewLaneTitle}>Create and compose child</h3>

              <div className={styles.systemsViewFormField}>
                <label className={styles.systemsViewFormLabel} htmlFor="systems-view-create-name">
                  Name
                </label>
                <input
                  id="systems-view-create-name"
                  className={styles.systemsViewFormInput}
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="New child organism"
                  disabled={createComposePending}
                />
              </div>

              <div className={styles.systemsViewFormField}>
                <label className={styles.systemsViewFormLabel} htmlFor="systems-view-create-content">
                  Content
                </label>
                <textarea
                  id="systems-view-create-content"
                  className={styles.systemsViewFormTextarea}
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  placeholder="# New child content"
                  disabled={createComposePending}
                />
              </div>

              <div className={styles.systemsViewFormRow}>
                <div className={styles.systemsViewFormField}>
                  <label className={styles.systemsViewFormLabel} htmlFor="systems-view-create-format">
                    Format
                  </label>
                  <select
                    id="systems-view-create-format"
                    className={styles.systemsViewFormSelect}
                    value={draftFormat}
                    onChange={(event) => setDraftFormat(event.target.value as SystemsViewTextFormat)}
                    disabled={createComposePending}
                  >
                    <option value="markdown">markdown</option>
                    <option value="plaintext">plaintext</option>
                  </select>
                </div>

                <label className={styles.systemsViewFormCheckbox}>
                  <input
                    type="checkbox"
                    checked={draftOpenTrunk}
                    onChange={(event) => setDraftOpenTrunk(event.target.checked)}
                    disabled={createComposePending}
                  />
                  Open trunk
                </label>
              </div>

              <div className={styles.systemsViewActions}>
                <button
                  type="button"
                  className={styles.systemsViewActionButton}
                  disabled={!canSubmitCreateCompose}
                  onClick={() => void handleCreateAndCompose()}
                >
                  {createComposePending ? 'Thresholding...' : 'Threshold and compose'}
                </button>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}

function resolveCreateComposeError(error: unknown, createdChildId: string | null): string {
  if (createdChildId) {
    if (error instanceof Error) {
      return `Threshold succeeded (${createdChildId}) but compose failed: ${error.message}`;
    }
    return `Threshold succeeded (${createdChildId}) but compose failed.`;
  }

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'You are not authorized to compose in this boundary.';
    }
    if (error.status === 404) {
      return 'Target boundary was not found.';
    }
    if (error.status === 409) {
      return error.message || 'Composition conflict detected.';
    }
    if (error.status === 400) {
      return error.message || 'Threshold payload is invalid.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Failed to threshold and compose child organism.';
}
