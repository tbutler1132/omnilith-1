/**
 * Spatial mini-map widget.
 *
 * Shows a compact world-bounds preview above spatial navigation so stewards
 * can keep cursor and focus orientation without relying on map grid lines.
 */

import { OrganismRenderer } from '../../../space/interior/renderers/organism-renderer.js';
import { useEnteredOrganism } from '../../../space/interior/use-entered-organism.js';
import type { VisorAppSpatialContext, VisorAppSpatialPoint } from '../../apps/spatial-context-contract.js';

interface SpatialMiniMapWidgetProps {
  readonly spatialContext: VisorAppSpatialContext;
}

interface NormalizedPoint {
  readonly x: number;
  readonly y: number;
}

interface NearestEntryMatch {
  readonly x: number;
  readonly y: number;
}

const CURSOR_ENTRY_SNAP_DISTANCE_WORLD_UNITS = 160;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizePoint(
  point: VisorAppSpatialPoint | null,
  mapSize: { width: number; height: number } | null,
): NormalizedPoint | null {
  if (!point || !mapSize) {
    return null;
  }

  if (
    !Number.isFinite(mapSize.width) ||
    !Number.isFinite(mapSize.height) ||
    mapSize.width <= 0 ||
    mapSize.height <= 0
  ) {
    return null;
  }

  return {
    x: clamp01(point.x / mapSize.width),
    y: clamp01(point.y / mapSize.height),
  };
}

function toPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function resolveNearestEntryPoint(
  cursorPoint: VisorAppSpatialPoint | null,
  entries: ReadonlyArray<{ organismId: string; x: number; y: number }>,
): NearestEntryMatch | null {
  if (!cursorPoint || entries.length === 0) {
    return null;
  }

  let nearest: NearestEntryMatch | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    const dx = entry.x - cursorPoint.x;
    const dy = entry.y - cursorPoint.y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearest = {
        x: entry.x,
        y: entry.y,
      };
    }
  }

  if (!nearest) {
    return null;
  }

  if (nearestDistanceSquared > CURSOR_ENTRY_SNAP_DISTANCE_WORLD_UNITS * CURSOR_ENTRY_SNAP_DISTANCE_WORLD_UNITS) {
    return null;
  }

  return nearest;
}

function renderMarker(className: string, point: NormalizedPoint | null) {
  if (!point) {
    return null;
  }

  return (
    <span
      className={`spatial-mini-map-marker ${className}`}
      style={{ left: toPercent(point.x), top: toPercent(point.y) }}
      aria-hidden="true"
    />
  );
}

function EnteredOrganismMiniPreview({ organismId }: { organismId: string }) {
  const { data, loading, error } = useEnteredOrganism(organismId);
  const hasCurrentState = Boolean(data?.currentState);
  const isPending = loading || (!data && !error);

  return (
    <div className="spatial-mini-map-canvas spatial-mini-map-canvas--organism" aria-hidden="true">
      {isPending ? <p className="spatial-mini-map-organism-status">Loading organism...</p> : null}
      {!isPending && error ? <p className="spatial-mini-map-organism-status">Preview unavailable</p> : null}
      {!isPending && !error && !hasCurrentState ? (
        <p className="spatial-mini-map-organism-status">No current state</p>
      ) : null}
      {!isPending && !error && hasCurrentState && data?.currentState ? (
        <div className="spatial-mini-map-organism-preview">
          <OrganismRenderer contentTypeId={data.currentState.contentTypeId} payload={data.currentState.payload} />
        </div>
      ) : null}
    </div>
  );
}

export function SpatialMiniMapWidget({ spatialContext }: SpatialMiniMapWidgetProps) {
  if (spatialContext.enteredOrganismId) {
    return (
      <section className="visor-widget spatial-mini-map-widget" aria-label="Organism mini preview">
        <EnteredOrganismMiniPreview organismId={spatialContext.enteredOrganismId} />
      </section>
    );
  }

  const mapSize = spatialContext.mapSize;
  const hasMapSize = Boolean(
    mapSize &&
      Number.isFinite(mapSize.width) &&
      Number.isFinite(mapSize.height) &&
      mapSize.width > 0 &&
      mapSize.height > 0,
  );
  const nearestEntryMatch =
    spatialContext.hoveredEntry === null
      ? resolveNearestEntryPoint(spatialContext.cursorWorld, spatialContext.mapEntries)
      : null;
  const snappedCursorEntryPoint =
    spatialContext.hoveredEntry ??
    (nearestEntryMatch
      ? {
          x: nearestEntryMatch.x,
          y: nearestEntryMatch.y,
        }
      : null);
  const cursorSourcePoint = snappedCursorEntryPoint ?? spatialContext.cursorWorld;
  const cursorPoint = normalizePoint(cursorSourcePoint, mapSize);
  const focusSourcePoint = spatialContext.focusedEntry;
  const focusPoint = normalizePoint(focusSourcePoint, mapSize);
  const entryPoints = spatialContext.mapEntries
    .map((entry) => ({ organismId: entry.organismId, point: normalizePoint(entry, mapSize) }))
    .filter((entry): entry is { organismId: string; point: NormalizedPoint } => entry.point !== null);

  return (
    <section className="visor-widget spatial-mini-map-widget" aria-label="Spatial mini-map">
      <div className="spatial-mini-map-canvas" aria-hidden="true">
        <span className="spatial-mini-map-boundary" />
        {entryPoints.map((entry) => (
          <span
            key={entry.organismId}
            className="spatial-mini-map-entry"
            style={{ left: toPercent(entry.point.x), top: toPercent(entry.point.y) }}
          />
        ))}
        {renderMarker('spatial-mini-map-marker--cursor', cursorPoint)}
        {renderMarker('spatial-mini-map-marker--focus', focusPoint)}
        {!hasMapSize ? <p className="spatial-mini-map-empty">Telemetry pending</p> : null}
      </div>
    </section>
  );
}
