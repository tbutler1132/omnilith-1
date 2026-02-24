/**
 * Spatial readout widget.
 *
 * Shows live map telemetry so stewards can inspect cursor position and
 * hovered/focused organism surface data without opening a separate panel.
 */

import type { VisorAppSpatialContext, VisorAppSurfaceEntrySnapshot } from '../../apps/spatial-context-contract.js';

interface SpatialReadoutWidgetProps {
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

export function SpatialReadoutWidget({ spatialContext }: SpatialReadoutWidgetProps) {
  return (
    <section className="space-readout-widget" aria-label="Map readout">
      <p className="space-readout-title">Map readout</p>
      <dl className="space-readout-table">
        <div className="space-readout-row">
          <dt className="space-readout-key">Map</dt>
          <dd className="space-readout-value">{formatMapLabel(spatialContext.mapOrganismId)}</dd>
        </div>
        <div className="space-readout-row">
          <dt className="space-readout-key">Cursor</dt>
          <dd className="space-readout-value">{formatPoint(spatialContext.cursorWorld)}</dd>
        </div>
        <div className="space-readout-row">
          <dt className="space-readout-key">Hover</dt>
          <dd className="space-readout-value">{formatEntry(spatialContext.hoveredEntry)}</dd>
        </div>
        <div className="space-readout-row">
          <dt className="space-readout-key">Focus</dt>
          <dd className="space-readout-value">{formatEntry(spatialContext.focusedEntry)}</dd>
        </div>
      </dl>
    </section>
  );
}
