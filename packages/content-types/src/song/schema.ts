/**
 * Song content type — schema for parent song organisms.
 *
 * A song organism carries the core identity and creative trajectory.
 * Audio mixes, cover art, stems, and source projects live as composed
 * child organisms inside the song boundary.
 */

export interface SongPayload {
  readonly title: string;
  readonly artistCredit: string;
  readonly status: SongStatus;
  readonly tempoBpm?: number;
  readonly keySignature?: string;
  readonly notes?: string;
  readonly metadata?: Record<string, unknown>;
}

export type SongStatus = 'idea' | 'draft' | 'mixing' | 'mastered' | 'released';

export const SONG_STATUSES: ReadonlySet<string> = new Set(['idea', 'draft', 'mixing', 'mastered', 'released']);
