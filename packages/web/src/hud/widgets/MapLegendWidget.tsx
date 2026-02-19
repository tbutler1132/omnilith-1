/**
 * MapLegendWidget - compact marker legend for spatial-map exploration.
 *
 * Mirrors the map marker language so custom marker distinctions for
 * content types remain understandable while navigating the map.
 */

interface MapLegendEntry {
  contentTypeId: 'community' | 'song' | 'hero-journey-scene';
  label: string;
}

const MAP_LEGEND_ENTRIES: readonly MapLegendEntry[] = [
  { contentTypeId: 'community', label: 'Community' },
  { contentTypeId: 'song', label: 'Song' },
  { contentTypeId: 'hero-journey-scene', label: 'Hero Journey Scene' },
];

export function MapLegendWidget() {
  return (
    <div className="visor-widget map-legend-widget">
      <span className="visor-widget-label">Map legend</span>
      <ul className="map-legend-list">
        {MAP_LEGEND_ENTRIES.map((entry) => (
          <li key={entry.contentTypeId} className="map-legend-item">
            <span className={`map-legend-marker map-legend-marker--${entry.contentTypeId}`} aria-hidden="true">
              <span className="organism-dot" />
            </span>
            <span>{entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
