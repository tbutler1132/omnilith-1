/**
 * Audio renderer — displays audio organism metadata.
 *
 * Shows title, artist, duration, format badge, and sample rate.
 * Feels like a record sleeve — title prominent, metadata quiet.
 */

import type { RendererProps } from './registry.js';

interface AudioPayload {
  durationSeconds?: number;
  format?: string;
  sampleRate?: number;
  metadata?: {
    title?: string;
    artist?: string;
    duration?: number;
    format?: string;
    sampleRate?: number;
  };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as AudioPayload;
  const meta = payload?.metadata ?? {};
  const duration = payload?.durationSeconds ?? meta.duration;
  const format = payload?.format ?? meta.format;
  const sampleRate = payload?.sampleRate ?? meta.sampleRate;

  return (
    <div className="audio-renderer">
      <h1 className="audio-title">{meta.title ?? 'Untitled'}</h1>
      {meta.artist && <p className="audio-artist">{meta.artist}</p>}
      <div className="audio-meta">
        {duration != null && <span className="audio-duration">{formatDuration(duration)}</span>}
        {format && <span className="audio-badge">{format}</span>}
      </div>
      {sampleRate != null && <span className="audio-sample-rate">{(sampleRate / 1000).toFixed(1)} kHz</span>}
    </div>
  );
}
