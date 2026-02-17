/**
 * HudMyOrganisms — compact scrollable list of the user's organisms.
 *
 * Displayed inside a floating panel when the user clicks "My Organisms"
 * in the map actions. Clicking an item focuses it on the map.
 */

import { useMemo, useState } from 'react';
import { useUserOrganisms } from '../../../hooks/use-organism.js';
import { usePlatformMapState } from '../../../platform/index.js';
import { PanelCardEmpty, PanelCardErrorWithAction, PanelCardLoading } from '../core/panel-ux.js';

interface HudMyOrganismsProps {
  onSelect: (organismId: string) => void;
}

function formatContentTypeLabel(contentTypeId?: string) {
  if (!contentTypeId) return 'Unknown';
  return contentTypeId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function HudMyOrganisms({ onSelect }: HudMyOrganismsProps) {
  const { focusedOrganismId } = usePlatformMapState();
  const [query, setQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: organisms, loading, error } = useUserOrganisms(refreshKey);

  const typeFilterOptions = useMemo(() => {
    if (!organisms || organisms.length === 0) return [];

    const counts = new Map<string, number>();
    organisms.forEach((ows) => {
      const key = ows.currentState?.contentTypeId ?? 'unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => ({ id, count }));
  }, [organisms]);

  const filteredOrganisms = useMemo(() => {
    if (!organisms) return [];

    const normalizedQuery = query.trim().toLowerCase();
    const matches = organisms.filter((ows) => {
      const typeId = ows.currentState?.contentTypeId ?? 'unknown';
      const matchesType = activeTypeFilter === 'all' || typeId === activeTypeFilter;
      if (!matchesType) return false;

      if (normalizedQuery.length === 0) return true;
      const name = ows.organism.name.toLowerCase();
      const contentType = (ows.currentState?.contentTypeId ?? '').toLowerCase();
      return name.includes(normalizedQuery) || contentType.includes(normalizedQuery);
    });

    return matches.sort((a, b) => {
      if (a.organism.id === focusedOrganismId) return -1;
      if (b.organism.id === focusedOrganismId) return 1;
      return a.organism.name.localeCompare(b.organism.name);
    });
  }, [organisms, query, focusedOrganismId, activeTypeFilter]);

  if (loading) {
    return <PanelCardLoading title="My Organisms" message="Gathering organisms you steward..." />;
  }

  if (error) {
    return (
      <PanelCardErrorWithAction
        title="My Organisms"
        message="Could not load your organisms."
        actionLabel="Retry"
        onAction={() => setRefreshKey((v) => v + 1)}
      />
    );
  }

  if (!organisms || organisms.length === 0) {
    return (
      <PanelCardEmpty title="My Organisms" message="No organisms yet. Use Threshold New to introduce your first one." />
    );
  }

  return (
    <div className="hud-my-organisms">
      <header className="hud-my-organisms-header">
        <div>
          <h3>My Organisms</h3>
          <p>Select one to tend in the visor.</p>
        </div>
        <span className="hud-my-organisms-count">
          {filteredOrganisms.length}/{organisms.length}
        </span>
      </header>

      <input
        type="text"
        className="hud-my-organisms-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or content type..."
        aria-label="Search your organisms"
      />

      <div className="hud-my-organisms-filters" role="toolbar" aria-label="Filter by content type">
        <button
          type="button"
          className={`hud-my-organisms-filter ${activeTypeFilter === 'all' ? 'hud-my-organisms-filter--active' : ''}`}
          onClick={() => setActiveTypeFilter('all')}
        >
          All
        </button>
        {typeFilterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`hud-my-organisms-filter ${activeTypeFilter === option.id ? 'hud-my-organisms-filter--active' : ''}`}
            onClick={() => setActiveTypeFilter(option.id)}
          >
            {formatContentTypeLabel(option.id)} ({option.count})
          </button>
        ))}
      </div>

      {filteredOrganisms.length === 0 ? (
        <div className="hud-my-organisms-state">
          <p>No organisms match this search.</p>
        </div>
      ) : (
        <ul className="hud-organism-list">
          {filteredOrganisms.map((ows) => {
            const focused = focusedOrganismId === ows.organism.id;
            const contentTypeId = ows.currentState?.contentTypeId;
            return (
              <li key={ows.organism.id}>
                <button
                  type="button"
                  className={`hud-organism-item ${focused ? 'hud-organism-item--focused' : ''}`}
                  onClick={() => onSelect(ows.organism.id)}
                >
                  <span className="hud-organism-row">
                    <span className="hud-organism-preview">{ows.organism.name}</span>
                    {focused && <span className="hud-organism-focus-tag">Focused</span>}
                  </span>
                  <span className="hud-organism-meta">
                    <span className="hud-organism-type">{formatContentTypeLabel(contentTypeId)}</span>
                    <span className="hud-organism-id">{ows.organism.id.slice(-8)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
