/**
 * Stems bundle content type — schema for exported production stems.
 *
 * Stems are delivery artifacts derived from source production work.
 * They remain separate organisms so they can evolve independently while
 * staying inside the parent song boundary.
 */

export interface StemsBundlePayload {
  readonly fileReference: string;
  readonly format: StemsBundleFormat;
  readonly stemCount?: number;
  readonly sampleRate?: number;
  readonly bitDepth?: StemsBitDepth;
  readonly metadata?: Record<string, unknown>;
}

export type StemsBundleFormat = 'zip' | 'tar' | 'folder-manifest';

export type StemsBitDepth = 16 | 24 | 32;

export const STEMS_BUNDLE_FORMATS: ReadonlySet<string> = new Set(['zip', 'tar', 'folder-manifest']);

export const STEMS_BIT_DEPTHS: ReadonlySet<number> = new Set([16, 24, 32]);
