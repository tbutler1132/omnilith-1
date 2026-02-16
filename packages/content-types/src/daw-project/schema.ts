/**
 * DAW project content type — schema for source production files.
 *
 * This content type represents source project files from digital audio
 * workstations like Ableton or Logic. It keeps production lineage as a
 * first-class organism in the song boundary.
 */

export interface DawProjectPayload {
  readonly fileReference: string;
  readonly daw: DawName;
  readonly format: DawProjectFormat;
  readonly versionLabel?: string;
  readonly metadata?: Record<string, unknown>;
}

export type DawName = 'ableton-live' | 'logic-pro' | 'fl-studio' | 'pro-tools' | 'reaper' | 'other';

export type DawProjectFormat = 'als' | 'logicx' | 'flp' | 'ptx' | 'rpp' | 'zip' | 'other';

export const DAW_NAMES: ReadonlySet<string> = new Set([
  'ableton-live',
  'logic-pro',
  'fl-studio',
  'pro-tools',
  'reaper',
  'other',
]);

export const DAW_PROJECT_FORMATS: ReadonlySet<string> = new Set(['als', 'logicx', 'flp', 'ptx', 'rpp', 'zip', 'other']);
