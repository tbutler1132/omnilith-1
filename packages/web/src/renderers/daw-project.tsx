/**
 * DAW project renderer — metadata card for source production files.
 *
 * Keeps source project context visible without exposing raw file internals.
 */

import type { RendererProps } from './registry.js';

interface DawProjectPayload {
  fileReference?: string;
  daw?: string;
  format?: string;
  versionLabel?: string;
  metadata?: {
    title?: string;
  };
}

export function DawProjectRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as DawProjectPayload;
  const title = payload.metadata?.title ?? 'Source Project';

  return (
    <div className="asset-renderer">
      <h1 className="asset-title">{title}</h1>
      <div className="asset-meta-grid">
        <div className="asset-meta-item">
          <span className="asset-meta-label">DAW</span>
          <span className="asset-meta-value">{payload.daw ?? 'unknown'}</span>
        </div>
        <div className="asset-meta-item">
          <span className="asset-meta-label">Format</span>
          <span className="asset-meta-value">{payload.format ?? 'unknown'}</span>
        </div>
        <div className="asset-meta-item">
          <span className="asset-meta-label">Version</span>
          <span className="asset-meta-value">{payload.versionLabel ?? '—'}</span>
        </div>
      </div>
      <p className="asset-file-reference">{payload.fileReference ?? 'No file reference'}</p>
    </div>
  );
}
