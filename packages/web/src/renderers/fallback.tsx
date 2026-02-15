/**
 * Fallback renderer — structured display for unknown content types.
 *
 * Shows the content type as a badge and iterates top-level payload
 * keys as labeled rows. Nested objects get a formatted pre block.
 */

import type { RendererProps } from './registry.js';

function renderValue(value: unknown) {
  if (value === null || value === undefined) {
    return <span className="fallback-value">—</span>;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <span className="fallback-value">{String(value)}</span>;
  }
  return (
    <div className="fallback-value">
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

export function FallbackRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as Record<string, unknown> | null;
  const entries = payload && typeof payload === 'object' ? Object.entries(payload) : [];

  return (
    <div className="fallback-renderer">
      <span className="fallback-type-badge">{state.contentTypeId}</span>
      <div className="fallback-fields">
        {entries.map(([key, value]) => (
          <div key={key} className="fallback-field">
            <span className="fallback-key">{key}</span>
            {renderValue(value)}
          </div>
        ))}
        {entries.length === 0 && <span className="hud-info-dim">No payload data</span>}
      </div>
    </div>
  );
}
