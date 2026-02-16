/**
 * Template values types — shared model for template value customization flow.
 *
 * Keeps the template list and template value panel aligned on the same
 * customization payload shape without touching kernel contracts.
 */

export type SongStatus = 'idea' | 'draft' | 'mixing' | 'mastered' | 'released';

export interface SongPayloadDraft {
  readonly title: string;
  readonly artistCredit: string;
  readonly status: SongStatus;
  readonly tempoBpm?: number;
  readonly keySignature?: string;
  readonly notes?: string;
  readonly basePayload: Record<string, unknown>;
}

export interface TemplateSongCustomization {
  readonly templateId: string;
  readonly templateName: string;
  readonly songStepRef: string;
  readonly seedPayload: SongPayloadDraft;
}
