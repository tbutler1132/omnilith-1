/**
 * Map Studio app.
 *
 * Provides a surface-first map curation workspace that lets signed-in users
 * place unsurfaced organisms onto the current map boundary.
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

  const [locallySurfacedIds, setLocallySurfacedIds] = useState<ReadonlySet<string>>(new Set());
  const [pendingSurfaceOrganismId, setPendingSurfaceOrganismId] = useState<string | null>(null);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [surfaceNotice, setSurfaceNotice] = useState<string | null>(null);

  const surfacedIds = useMemo(
    () => new Set(data?.mapEntries.map((entry) => entry.organismId) ?? []),
    [data?.mapEntries],
  );
  const candidates = useMemo(
    () =>
      presentMapStudioCandidates({
        organisms: data?.myOrganisms ?? [],
        surfacedOrganismIds: surfacedIds,
        excludedOrganismIds: locallySurfacedIds,
        mapOrganismId: data?.mapOrganism.id ?? null,
      }),
    [data?.mapOrganism.id, data?.myOrganisms, locallySurfacedIds, surfacedIds],
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
      setLocallySurfacedIds(new Set());
      setPendingSurfaceOrganismId(null);
      setSurfaceError(null);
      setSurfaceNotice(null);
      return;
    }

    setLocallySurfacedIds(new Set());
    setPendingSurfaceOrganismId(null);
    setSurfaceError(null);
    setSurfaceNotice(null);
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
    setSurfaceError(null);
    setSurfaceNotice(null);
    setRouteState({
      targetedOrganismId: routeState.targetedOrganismId,
      selectedCandidateId: candidateId,
    });
  };

  const handleSurfaceCandidate = async () => {
    if (!data || !selectedCandidate || !placement) {
      return;
    }

    setPendingSurfaceOrganismId(selectedCandidate.id);
    setSurfaceError(null);
    setSurfaceNotice(null);

    try {
      const response = await surfaceMapStudioCandidate({
        mapOrganismId: data.targetMapId,
        organismId: selectedCandidate.id,
        x: placement.x,
        y: placement.y,
      });

      setLocallySurfacedIds((previous) => new Set([...previous, selectedCandidate.id]));
      setSurfaceNotice(
        response.status === 'already-surfaced'
          ? `${selectedCandidate.name} is already surfaced on this map.`
          : `Surfaced ${selectedCandidate.name} at (${response.entry.x}, ${response.entry.y}).`,
      );
    } catch (nextError) {
      setSurfaceError(nextError instanceof Error ? nextError.message : 'Failed to surface organism.');
    } finally {
      setPendingSurfaceOrganismId(null);
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
            <dd>{data.mapEntries.length + locallySurfacedIds.size}</dd>
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
            <h3 className={styles.mapStudioLaneTitle}>Surfacing candidates</h3>
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
                    <span className={styles.mapStudioSecondary}>{candidate.contentTypeId ?? 'no current state'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.mapStudioLane}>
            <h3 className={styles.mapStudioLaneTitle}>Surface selected organism</h3>
            {selectedCandidate ? (
              <article className={styles.mapStudioCandidatePanel}>
                <p className={styles.mapStudioPrimary}>{selectedCandidate.name}</p>
                <p className={styles.mapStudioSecondary}>{selectedCandidate.id}</p>
                <p className={styles.mapStudioSecondary}>{selectedCandidate.contentTypeId ?? 'no current state'}</p>
                <button
                  type="button"
                  className={styles.mapStudioActionButton}
                  disabled={pendingSurfaceOrganismId !== null || placement === null}
                  onClick={() => void handleSurfaceCandidate()}
                >
                  {pendingSurfaceOrganismId === selectedCandidate.id
                    ? 'Surfacing...'
                    : placement === null
                      ? 'Pick map spot first'
                      : 'Surface onto map'}
                </button>
              </article>
            ) : (
              <p className={styles.mapStudioEmpty}>Select an organism candidate to surface.</p>
            )}
          </section>
        </div>
      )}

      {surfaceNotice ? <p className={styles.mapStudioNotice}>{surfaceNotice}</p> : null}
      {surfaceError ? <p className={styles.mapStudioSectionError}>{surfaceError}</p> : null}
    </section>
  );
}
