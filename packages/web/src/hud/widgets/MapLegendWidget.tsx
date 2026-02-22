/**
 * MapLegendWidget - compact marker legend for spatial-map exploration.
 *
 * Mirrors the map marker language so custom marker distinctions for
 * content types remain understandable while navigating the map.
 */

interface MapLegendEntry {
  markerClass: 'community' | 'song' | 'hero-journey-scene' | 'github-repository' | 'institution' | 'system';
  label: string;
}

const MAP_LEGEND_ENTRIES: readonly MapLegendEntry[] = [
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
              <span className="organism-dot" />
            </span>
            <span>{entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
