/**
 * Map Studio app.
 *
 * Provides a map curation workspace that lets signed-in users reposition
 * their already surfaced organisms within the current map boundary.
 */

import { useEffect, useMemo, useState } from 'react';
import type { VisorAppRenderProps } from '../app-contract.js';
import styles from './map-studio-app.module.css';
import { type MapStudioAppRouteState, resolveMapStudioAppRouteState } from './map-studio-app-route.js';
import {
  presentMapStudioCandidates,
  presentMapStudioStatus,
  resolveMapStudioPlacement,
} from './map-studio-presenter.js';
import { surfaceMapStudioCandidate } from './map-studio-write.js';
import { useMapStudioData } from './use-map-studio-data.js';

export function MapStudioApp({
  onRequestClose,
  organismId,
  appRouteState,
  onChangeAppRouteState,
  spatialContext,
}: VisorAppRenderProps<MapStudioAppRouteState>) {
  void onRequestClose;

  const routeState = resolveMapStudioAppRouteState(appRouteState, organismId);
  const currentMapContextId = spatialContext.mapOrganismId;
  const requestedMapId = currentMapContextId ?? routeState.targetedOrganismId;
  const { data, loading, error, requiresSignIn, sectionErrors } = useMapStudioData(requestedMapId);

  const [pendingMoveOrganismId, setPendingMoveOrganismId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moveNotice, setMoveNotice] = useState<string | null>(null);

  const candidates = useMemo(
    () =>
      presentMapStudioCandidates({
        organisms: data?.myOrganisms ?? [],
        mapEntries: data?.mapEntries ?? [],
        mapOrganismId: data?.mapOrganism.id ?? null,
      }),
    [data?.mapEntries, data?.mapOrganism.id, data?.myOrganisms],
  );
  const selectedCandidate = routeState.selectedCandidateId
    ? (candidates.find((entry) => entry.id === routeState.selectedCandidateId) ?? null)
    : (candidates[0] ?? null);

  const isSpatialMapTarget = data?.mapState?.contentTypeId === 'spatial-map';
  const loadedTargetMapId = data?.targetMapId ?? null;
  const presentedStatus = presentMapStudioStatus({
    loading,
    error,
    hasMapOrganism: Boolean(data?.mapOrganism),
    isSpatialMapTarget,
    requiresSignIn,
    candidateCount: candidates.length,
  });

  const placement = resolveMapStudioPlacement({
    cursorWorld: spatialContext.cursorWorld,
  });

  useEffect(() => {
    if (loadedTargetMapId === null) {
      setPendingMoveOrganismId(null);
      setMoveError(null);
      setMoveNotice(null);
      return;
    }

    setPendingMoveOrganismId(null);
    setMoveError(null);
    setMoveNotice(null);
  }, [loadedTargetMapId]);

  useEffect(() => {
    if (!onChangeAppRouteState) {
      return;
    }

    const nextTargetedOrganismId = currentMapContextId ?? routeState.targetedOrganismId ?? data?.targetMapId ?? null;
    if (nextTargetedOrganismId !== routeState.targetedOrganismId) {
      onChangeAppRouteState({
        targetedOrganismId: nextTargetedOrganismId,
        selectedCandidateId: routeState.selectedCandidateId,
      });
    }
  }, [
    currentMapContextId,
    data?.targetMapId,
    onChangeAppRouteState,
    routeState.selectedCandidateId,
    routeState.targetedOrganismId,
  ]);

  useEffect(() => {
    if (!onChangeAppRouteState) {
      return;
    }

    if (candidates.length === 0) {
      if (routeState.selectedCandidateId !== null) {
        onChangeAppRouteState({
          targetedOrganismId: routeState.targetedOrganismId,
          selectedCandidateId: null,
        });
      }
      return;
    }

    if (selectedCandidate && routeState.selectedCandidateId === selectedCandidate.id) {
      return;
    }

    onChangeAppRouteState({
      targetedOrganismId: routeState.targetedOrganismId,
      selectedCandidateId: selectedCandidate?.id ?? null,
    });
  }, [
    candidates,
    onChangeAppRouteState,
    routeState.selectedCandidateId,
    routeState.targetedOrganismId,
    selectedCandidate,
  ]);

  const setRouteState = (nextState: MapStudioAppRouteState) => {
    onChangeAppRouteState?.(nextState);
  };

  const handleSelectCandidate = (candidateId: string) => {
    setMoveError(null);
    setMoveNotice(null);
    setRouteState({
      targetedOrganismId: routeState.targetedOrganismId,
      selectedCandidateId: candidateId,
    });
  };

  const handleMoveCandidate = async () => {
    if (!data || !selectedCandidate || !placement) {
      return;
    }

    setPendingMoveOrganismId(selectedCandidate.id);
    setMoveError(null);
    setMoveNotice(null);

    try {
      const response = await surfaceMapStudioCandidate({
        mapOrganismId: data.targetMapId,
        organismId: selectedCandidate.id,
        x: placement.x,
        y: placement.y,
      });

      if (response.status === 'already-surfaced') {
        setMoveNotice(`${selectedCandidate.name} is already at (${response.entry.x}, ${response.entry.y}).`);
      } else if (response.status === 'repositioned') {
        setMoveNotice(`Moved ${selectedCandidate.name} to (${response.entry.x}, ${response.entry.y}).`);
      } else {
        setMoveNotice(`Placed ${selectedCandidate.name} at (${response.entry.x}, ${response.entry.y}).`);
      }
    } catch (nextError) {
      setMoveError(nextError instanceof Error ? nextError.message : 'Failed to move organism.');
    } finally {
      setPendingMoveOrganismId(null);
    }
  };

  return (
    <section className={styles.mapStudioApp}>
      <h2 className={styles.mapStudioTitle}>Map Studio</h2>

      {data ? (
        <p className={styles.mapStudioTarget}>
          Targeting: <strong>{data.mapOrganism.name}</strong> ({data.mapOrganism.id})
        </p>
      ) : null}

      {data ? (
        <dl className={styles.mapStudioMeta}>
          <div className={styles.mapStudioMetaRow}>
            <dt>Map size</dt>
            <dd>
              {data.mapSize.width} x {data.mapSize.height}
            </dd>
          </div>
          <div className={styles.mapStudioMetaRow}>
            <dt>Surfaced</dt>
            <dd>{data.mapEntries.length}</dd>
          </div>
          <div className={styles.mapStudioMetaRow}>
            <dt>Placement</dt>
            <dd>
              {placement ? `${placement.x}, ${placement.y} · ${placement.source}` : 'Pick a map spot with your cursor.'}
            </dd>
          </div>
          <div className={styles.mapStudioMetaRow}>
            <dt>Target type</dt>
            <dd>{data.mapState?.contentTypeId ?? 'none'}</dd>
          </div>
        </dl>
      ) : null}

      {presentedStatus.status !== 'ready' ? <p className={styles.mapStudioStatus}>{presentedStatus.message}</p> : null}

      {sectionErrors.candidates ? (
        <p className={styles.mapStudioSectionError}>{sectionErrors.candidates.message}</p>
      ) : null}

      {(presentedStatus.status === 'ready' || (presentedStatus.status === 'empty' && candidates.length > 0)) && (
        <div className={styles.mapStudioWorkspace}>
          <section className={styles.mapStudioLane}>
            <h3 className={styles.mapStudioLaneTitle}>Reposition candidates</h3>
            <ul className={styles.mapStudioList}>
              {candidates.map((candidate) => (
                <li key={candidate.id} className={styles.mapStudioListItem}>
                  <button
                    type="button"
                    className={`${styles.mapStudioListButton} ${candidate.id === selectedCandidate?.id ? styles.mapStudioListButtonSelected : ''}`}
                    onClick={() => handleSelectCandidate(candidate.id)}
                  >
                    <span className={styles.mapStudioPrimary}>{candidate.name}</span>
                    <span className={styles.mapStudioSecondary}>{candidate.id}</span>
                    <span className={styles.mapStudioSecondary}>
                      {Math.round(candidate.x)}, {Math.round(candidate.y)}
                    </span>
                    <span className={styles.mapStudioSecondary}>{candidate.contentTypeId ?? 'no current state'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.mapStudioLane}>
            <h3 className={styles.mapStudioLaneTitle}>Move selected organism</h3>
            {selectedCandidate ? (
              <article className={styles.mapStudioCandidatePanel}>
                <p className={styles.mapStudioPrimary}>{selectedCandidate.name}</p>
                <p className={styles.mapStudioSecondary}>{selectedCandidate.id}</p>
                <p className={styles.mapStudioSecondary}>
                  Current: {Math.round(selectedCandidate.x)}, {Math.round(selectedCandidate.y)}
                </p>
                <p className={styles.mapStudioSecondary}>{selectedCandidate.contentTypeId ?? 'no current state'}</p>
                <button
                  type="button"
                  className={styles.mapStudioActionButton}
                  disabled={pendingMoveOrganismId !== null || placement === null}
                  onClick={() => void handleMoveCandidate()}
                >
                  {pendingMoveOrganismId === selectedCandidate.id
                    ? 'Repositioning...'
                    : placement === null
                      ? 'Pick map spot first'
                      : 'Move on map'}
                </button>
              </article>
            ) : (
              <p className={styles.mapStudioEmpty}>Select a surfaced organism to reposition.</p>
            )}
          </section>
        </div>
      )}

      {moveNotice ? <p className={styles.mapStudioNotice}>{moveNotice}</p> : null}
      {moveError ? <p className={styles.mapStudioSectionError}>{moveError}</p> : null}
    </section>
  );
}
