/**
 * Composition reference renderer — tracklist display for composition organisms.
 *
 * Shows arrangement type, numbered entry list with truncated organism IDs,
 * and entry count. Feels like a tracklist or table of contents.
 */

import type { RendererProps } from './registry.js';

interface CompositionEntry {
  organismId: string;
  position?: number;
}

interface CompositionPayload {
  arrangementType?: 'sequential' | 'unordered' | 'grouped';
  entries?: CompositionEntry[];
}

export function CompositionReferenceRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as CompositionPayload;
  const arrangement = payload?.arrangementType ?? 'unordered';
  const entries = payload?.entries ?? [];

  return (
    <div className="composition-renderer">
      <span className="composition-arrangement">{arrangement}</span>
      <div className="composition-entries">
        {entries.map((entry, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static list from payload
            key={i}
            className="composition-entry"
          >
            <span className="composition-position">{entry.position != null ? entry.position : i + 1}</span>
            <span className="composition-entry-id">{entry.organismId.slice(0, 12)}</span>
          </div>
        ))}
      </div>
      <span className="composition-count">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
      </span>
    </div>
  );
}
