/**
 * Space — the 2D spatial canvas where organisms are experienced.
 *
 * Phase B stub: reads the current map organism, parses spatial-map entries,
 * and renders them as a simple card grid. Replaced by real canvas in Phase C.
 */

import { useOrganism } from '../hooks/use-organism.js';
import { usePlatform } from '../platform/index.js';

interface MapEntry {
  organismId: string;
  x: number;
  y: number;
  label?: string;
  contentTypeId?: string;
}

export function Space() {
  const { state, focusOrganism, enterMap } = usePlatform();
  const { data, loading, error } = useOrganism(state.currentMapId);

  const entries = parseMapEntries(data?.currentState?.payload);

  return (
    <div className="space">
      {loading && <div className="space-empty">Loading map...</div>}
      {error && <div className="space-empty">Failed to load map.</div>}

      {!loading && !error && entries.length === 0 && (
        <div className="space-empty">
          <p>This space is empty.</p>
          <p className="space-hint">Open the visor to threshold organisms and compose them here.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-grid">
          {entries.map((entry) => (
            <button
              key={entry.organismId}
              type="button"
              className={`space-entry ${state.focusedOrganismId === entry.organismId ? 'space-entry--focused' : ''}`}
              onClick={() => focusOrganism(entry.organismId)}
              onDoubleClick={() => {
                if (entry.contentTypeId === 'spatial-map') {
                  enterMap(entry.organismId, entry.label ?? entry.organismId.slice(0, 8));
                }
              }}
            >
              <span className="content-type">{entry.contentTypeId ?? 'unknown'}</span>
              <span className="space-entry-label">{entry.label ?? entry.organismId.slice(0, 12)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function parseMapEntries(payload: unknown): MapEntry[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  if (!Array.isArray(p.entries)) return [];
  return p.entries.filter(
    (e: unknown): e is MapEntry =>
      typeof e === 'object' && e !== null && typeof (e as MapEntry).organismId === 'string',
  );
}
