/**
 * Image renderer — displays image organism metadata with placeholder frame.
 *
 * Shows title, an aspect-ratio placeholder rectangle (no actual image),
 * dimensions, format badge, and optional location.
 */

import type { RendererProps } from './registry.js';

interface ImagePayload {
  metadata: {
    title?: string;
    width?: number;
    height?: number;
    format?: string;
    location?: string;
  };
}

export function ImageRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as ImagePayload;
  const meta = payload?.metadata ?? {};

  const width = meta.width ?? 800;
  const height = meta.height ?? 600;
  const maxWidth = 480;
  const displayWidth = Math.min(width, maxWidth);
  const displayHeight = Math.round(displayWidth * (height / width));

  return (
    <div className="image-renderer">
      <h1 className="image-title">{meta.title ?? 'Untitled'}</h1>
      <div className="image-frame" style={{ width: displayWidth, height: displayHeight }}>
        {width} × {height}
      </div>
      <div className="image-details">
        <span className="image-dimensions">
          {width} × {height}
        </span>
        {meta.format && <span className="audio-badge">{meta.format}</span>}
      </div>
      {meta.location && <span className="image-location">{meta.location}</span>}
    </div>
  );
}
