/**
 * Map readout widget.
 *
 * Shows live map telemetry in the right HUD widget lane so stewards can
 * inspect cursor and selection state without opening a separate panel.
 */

import { resolveGridSpacing } from '../../../space/grid-spacing.js';
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

function formatGridCoordinate(
  point: { x: number; y: number } | null,
  mapSize: { width: number; height: number } | null,
): string {
  if (!point) {
    return 'none';
  }

  if (
    !mapSize ||
    !Number.isFinite(mapSize.width) ||
    !Number.isFinite(mapSize.height) ||
    mapSize.width <= 0 ||
    mapSize.height <= 0
  ) {
    return 'n/a';
  }

  const spacing = resolveGridSpacing(mapSize.width, mapSize.height);
  const columnCount = Math.floor(mapSize.width / spacing);
  const rowCount = Math.floor(mapSize.height / spacing);

  if (columnCount < 1 || rowCount < 1) {
    return 'n/a';
  }

  const fullGridWidth = columnCount * spacing;
  const fullGridHeight = rowCount * spacing;
  const originX = (mapSize.width - fullGridWidth) / 2;
  const originY = (mapSize.height - fullGridHeight) / 2;
  const maxX = originX + fullGridWidth;
  const maxY = originY + fullGridHeight;

  if (point.x < originX || point.x >= maxX || point.y < originY || point.y >= maxY) {
    return 'outside';
  }

  const column = Math.floor((point.x - originX) / spacing) + 1;
  const row = Math.floor((point.y - originY) / spacing) + 1;
  return `C${column} R${row}`;
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
          <dt className="map-readout-key">Grid</dt>
          <dd className="map-readout-value">
            {formatGridCoordinate(spatialContext.cursorWorld, spatialContext.mapSize)}
          </dd>
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
