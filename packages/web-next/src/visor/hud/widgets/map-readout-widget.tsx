/**
 * Map readout widget.
 *
 * Shows live map telemetry in the right HUD widget lane so stewards can
 * inspect cursor and selection state without opening a separate panel.
 */

import type { VisorAppSpatialContext, VisorAppSurfaceEntrySnapshot } from '../../apps/spatial-context-contract.js';

interface MapReadoutWidgetProps {
  readonly spatialContext: VisorAppSpatialContext;
}

function formatCoordinate(value: number): string {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }

  return `${Math.round(value)}`;
}

function formatPoint(point: { x: number; y: number } | null): string {
  if (!point) {
    return 'none';
  }

  return `${formatCoordinate(point.x)}, ${formatCoordinate(point.y)}`;
}

function formatSize(size: number): string {
  if (!Number.isFinite(size)) {
    return 'n/a';
  }

  const rounded = Math.round(size * 1000) / 1000;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

function formatEntry(entry: VisorAppSurfaceEntrySnapshot | null): string {
  if (!entry) {
    return 'none';
  }

  const type = entry.contentTypeId ?? 'unknown';
  return `${entry.name} · ${type} · ${formatPoint(entry)} · s=${formatSize(entry.size)}`;
}

function formatMapLabel(mapOrganismId: string | null): string {
  if (!mapOrganismId) {
    return 'none';
  }

  if (mapOrganismId.length <= 20) {
    return mapOrganismId;
  }

  return `${mapOrganismId.slice(0, 8)}...${mapOrganismId.slice(-4)}`;
}

export function MapReadoutWidget({ spatialContext }: MapReadoutWidgetProps) {
  return (
    <section className="visor-widget map-readout-widget" aria-label="Map readout">
      <p className="visor-widget-label">Map readout</p>
      <dl className="map-readout-table">
        <div className="map-readout-row">
          <dt className="map-readout-key">Map</dt>
          <dd className="map-readout-value">{formatMapLabel(spatialContext.mapOrganismId)}</dd>
        </div>
        <div className="map-readout-row">
          <dt className="map-readout-key">Cursor</dt>
          <dd className="map-readout-value">{formatPoint(spatialContext.cursorWorld)}</dd>
        </div>
        <div className="map-readout-row">
          <dt className="map-readout-key">Hover</dt>
          <dd className="map-readout-value">{formatEntry(spatialContext.hoveredEntry)}</dd>
        </div>
        <div className="map-readout-row">
          <dt className="map-readout-key">Focus</dt>
          <dd className="map-readout-value">{formatEntry(spatialContext.focusedEntry)}</dd>
        </div>
      </dl>
    </section>
  );
}
