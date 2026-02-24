/**
 * Map legend widget.
 *
 * Mirrors the marker icon language used in Space so organism icon
 * distinctions are understandable while navigating the map.
 */

import type { MarkerVariant } from '../../../space/marker-variant.js';

type MapLegendMarkerClass = Extract<
  MarkerVariant,
  'community' | 'institution' | 'system' | 'song' | 'hero-journey-scene' | 'github-repository'
>;

interface MapLegendEntry {
  readonly markerClass: MapLegendMarkerClass;
  readonly label: string;
}

const MAP_LEGEND_ENTRIES: ReadonlyArray<MapLegendEntry> = [
  { markerClass: 'community', label: 'Community' },
  { markerClass: 'institution', label: 'Institution' },
  { markerClass: 'system', label: 'System' },
  { markerClass: 'song', label: 'Song' },
  { markerClass: 'hero-journey-scene', label: 'Hero Journey Scene' },
  { markerClass: 'github-repository', label: 'GitHub Repository' },
];

export function MapLegendWidget() {
  return (
    <div className="visor-widget map-legend-widget">
      <span className="visor-widget-label">Map legend</span>
      <ul className="map-legend-list">
        {MAP_LEGEND_ENTRIES.map((entry) => (
          <li key={entry.markerClass} className="map-legend-item">
            <span className={`map-legend-marker map-legend-marker--${entry.markerClass}`} aria-hidden="true">
              <span className="space-organism-dot" />
            </span>
            <span>{entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
