/**
 * Query Explorer app.
 *
 * Provides global retrieval across accessible organisms with filter controls,
 * pagination, and direct pivot into organism view.
 */

import { useEffect, useState } from 'react';
import type { VisorAppRenderProps } from '../app-contract.js';
import styles from './query-explorer-app.module.css';
import {
  QUERY_EXPLORER_DEFAULT_LIMIT,
  QUERY_EXPLORER_DEFAULT_OFFSET,
  type QueryExplorerAppRouteState,
  resolveQueryExplorerAppRouteState,
} from './query-explorer-app-route.js';
import { presentQueryExplorerResults, presentQueryExplorerStatus } from './query-explorer-presenter.js';
import { useQueryExplorerData } from './use-query-explorer-data.js';

export function QueryExplorerApp({
  onRequestClose,
  organismId,
  appRouteState,
  onChangeAppRouteState,
  onOpenApp,
}: VisorAppRenderProps<QueryExplorerAppRouteState>) {
  void onRequestClose;

  const routeState = resolveQueryExplorerAppRouteState(appRouteState, organismId);
  const { data, loading, error, sectionErrors } = useQueryExplorerData(routeState);

  const [draftQuery, setDraftQuery] = useState(routeState.query);
  const [draftContentTypeId, setDraftContentTypeId] = useState(routeState.contentTypeId ?? '');
  const [draftCreatedBy, setDraftCreatedBy] = useState(routeState.createdBy ?? '');

  useEffect(() => {
    setDraftQuery(routeState.query);
    setDraftContentTypeId(routeState.contentTypeId ?? '');
    setDraftCreatedBy(routeState.createdBy ?? '');
  }, [routeState.contentTypeId, routeState.createdBy, routeState.query]);

  const presentedResults = presentQueryExplorerResults({
    organisms: data?.organisms ?? [],
    selectedOrganismId: routeState.selectedOrganismId,
  });

  const presentedStatus = presentQueryExplorerStatus({
    loading,
    error,
    resultCount: presentedResults.totalCount,
  });

  useEffect(() => {
    if (!onChangeAppRouteState) {
      return;
    }

    if (presentedStatus.status !== 'ready') {
      return;
    }

    if (routeState.selectedOrganismId === presentedResults.selectedOrganismId) {
      return;
    }

    onChangeAppRouteState({
      ...routeState,
      selectedOrganismId: presentedResults.selectedOrganismId,
    });
  }, [onChangeAppRouteState, presentedResults.selectedOrganismId, presentedStatus.status, routeState]);

  const setRouteState = (nextState: QueryExplorerAppRouteState) => {
    onChangeAppRouteState?.(nextState);
  };

  const handleApplyFilters = () => {
    setRouteState({
      ...routeState,
      query: draftQuery.trim(),
      contentTypeId: normalizeDraftNullableValue(draftContentTypeId),
      createdBy: normalizeDraftNullableValue(draftCreatedBy),
      offset: QUERY_EXPLORER_DEFAULT_OFFSET,
      selectedOrganismId: null,
    });
  };

  const handleResetFilters = () => {
    setDraftQuery('');
    setDraftContentTypeId('');
    setDraftCreatedBy('');

    setRouteState({
      ...routeState,
      query: '',
      contentTypeId: null,
      createdBy: null,
      limit: QUERY_EXPLORER_DEFAULT_LIMIT,
      offset: QUERY_EXPLORER_DEFAULT_OFFSET,
      selectedOrganismId: null,
    });
  };

  const handleSelectOrganism = (targetOrganismId: string) => {
    setRouteState({
      ...routeState,
      selectedOrganismId: targetOrganismId,
    });
  };

  const handleOpenOrganismView = (targetOrganismId: string) => {
    if (onOpenApp) {
      onOpenApp({
        appId: 'organism-view',
        organismId: targetOrganismId,
        appRouteState: {
          tab: 'state',
          targetedOrganismId: targetOrganismId,
        },
      });
      return;
    }

    setRouteState({
      ...routeState,
      targetedOrganismId: targetOrganismId,
      selectedOrganismId: targetOrganismId,
    });
  };

  const handlePreviousPage = () => {
    setRouteState({
      ...routeState,
      offset: Math.max(routeState.offset - routeState.limit, 0),
      selectedOrganismId: null,
    });
  };

  const handleNextPage = () => {
    setRouteState({
      ...routeState,
      offset: routeState.offset + routeState.limit,
      selectedOrganismId: null,
    });
  };

  const pageStart = routeState.offset + 1;
  const pageEnd = routeState.offset + presentedResults.entries.length;
  const canAdvancePage =
    presentedStatus.status === 'ready' && presentedResults.entries.length >= Math.max(routeState.limit, 1);

  return (
    <section className={styles.queryExplorerApp}>
      <h2 className={styles.queryExplorerTitle}>Query Explorer</h2>

      <p className={styles.queryExplorerDescription}>
        Global retrieval across accessible organisms. Filter, inspect, and pivot into organism view.
      </p>

      {routeState.targetedOrganismId ? (
        <p className={styles.queryExplorerBoundaryHint}>
          Boundary context: {routeState.targetedOrganismId} (global scope active)
        </p>
      ) : null}

      <form
        className={styles.queryExplorerFilters}
        onSubmit={(event) => {
          event.preventDefault();
          handleApplyFilters();
        }}
      >
        <label className={styles.queryExplorerField}>
          Name query
          <input
            className={styles.queryExplorerInput}
            type="text"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Search organism names..."
          />
        </label>

        <label className={styles.queryExplorerField}>
          Content type
          <input
            className={styles.queryExplorerInput}
            type="text"
            value={draftContentTypeId}
            onChange={(event) => setDraftContentTypeId(event.target.value)}
            placeholder="text, image, spatial-map..."
          />
        </label>

        <label className={styles.queryExplorerField}>
          Created by
          <input
            className={styles.queryExplorerInput}
            type="text"
            value={draftCreatedBy}
            onChange={(event) => setDraftCreatedBy(event.target.value)}
            placeholder="user id"
          />
        </label>

        <div className={styles.queryExplorerFilterActions}>
          <button type="submit" className={styles.queryExplorerActionButton}>
            Apply filters
          </button>
          <button type="button" className={styles.queryExplorerActionButton} onClick={handleResetFilters}>
            Reset
          </button>
        </div>
      </form>

      <div className={styles.queryExplorerPagination}>
        <button
          type="button"
          className={styles.queryExplorerActionButton}
          onClick={handlePreviousPage}
          disabled={routeState.offset <= 0 || presentedStatus.status !== 'ready'}
        >
          Previous page
        </button>
        <p className={styles.queryExplorerMeta}>
          {presentedStatus.status === 'ready'
            ? `Showing ${pageStart}-${pageEnd} of ${presentedResults.totalCount} in current page`
            : `Limit ${routeState.limit} · Offset ${routeState.offset}`}
        </p>
        <button
          type="button"
          className={styles.queryExplorerActionButton}
          onClick={handleNextPage}
          disabled={!canAdvancePage}
        >
          Next page
        </button>
      </div>

      {presentedStatus.status !== 'ready' ? (
        <p className={styles.queryExplorerStatus}>{presentedStatus.message}</p>
      ) : null}

      {presentedStatus.status === 'ready' && sectionErrors.results ? (
        <p className={styles.queryExplorerSectionError}>{sectionErrors.results.message}</p>
      ) : null}

      {presentedStatus.status === 'ready' ? (
        <ul className={styles.queryExplorerResults}>
          {presentedResults.entries.map((entry) => (
            <li key={entry.id} className={styles.queryExplorerResultItem}>
              <article
                className={`${styles.queryExplorerResultCard} ${entry.isSelected ? styles.queryExplorerResultCardSelected : ''}`}
              >
                <p className={styles.queryExplorerPrimary}>{entry.name}</p>
                <p className={styles.queryExplorerSecondary}>{entry.id}</p>
                <p className={styles.queryExplorerSecondary}>
                  {entry.contentTypeId} · {entry.openTrunk ? 'open-trunk' : 'regulated'} · steward {entry.createdBy}
                </p>

                <div className={styles.queryExplorerCardActions}>
                  <button
                    type="button"
                    className={styles.queryExplorerActionButton}
                    onClick={() => handleSelectOrganism(entry.id)}
                  >
                    {entry.isSelected ? 'Selected' : 'Select'}
                  </button>
                  <button
                    type="button"
                    className={styles.queryExplorerActionButton}
                    onClick={() => handleOpenOrganismView(entry.id)}
                  >
                    Open Organism View
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function normalizeDraftNullableValue(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
