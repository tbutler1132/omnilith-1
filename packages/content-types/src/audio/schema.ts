/**
 * Audio content type — schema for audio organisms.
 */

export interface AudioPayload {
  readonly fileReference: string;
  readonly durationSeconds: number;
  readonly format: AudioFormat;
  readonly sampleRate?: number;
  readonly metadata?: Record<string, unknown>;
}

export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg';

export const AUDIO_FORMATS: ReadonlySet<string> = new Set([
  'mp3', 'wav', 'flac', 'aac', 'ogg',
]);
