/**
 * Stems bundle renderer — metadata card for exported stems packages.
 *
 * Presents delivery-oriented details while keeping stems as a first-class
 * organism within the song boundary.
 */

import type { RendererProps } from './registry.js';

interface StemsBundlePayload {
  fileReference?: string;
  format?: string;
  stemCount?: number;
  sampleRate?: number;
  bitDepth?: number;
  metadata?: {
    title?: string;
  };
}

export function StemsBundleRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as StemsBundlePayload;
  const title = payload.metadata?.title ?? 'Stems Bundle';

  return (
    <div className="asset-renderer">
      <h1 className="asset-title">{title}</h1>
      <div className="asset-meta-grid">
        <div className="asset-meta-item">
          <span className="asset-meta-label">Format</span>
          <span className="asset-meta-value">{payload.format ?? 'unknown'}</span>
        </div>
        <div className="asset-meta-item">
          <span className="asset-meta-label">Stems</span>
          <span className="asset-meta-value">{payload.stemCount ?? '—'}</span>
        </div>
        <div className="asset-meta-item">
          <span className="asset-meta-label">Audio</span>
          <span className="asset-meta-value">
            {payload.sampleRate ? `${payload.sampleRate} Hz` : '—'}
            {payload.bitDepth ? ` / ${payload.bitDepth}-bit` : ''}
          </span>
        </div>
      </div>
      <p className="asset-file-reference">{payload.fileReference ?? 'No file reference'}</p>
    </div>
  );
}
