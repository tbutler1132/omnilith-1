/**
 * Text content type — schema for text/markdown organisms.
 */

export interface TextPayload {
  readonly content: string;
  readonly format: TextFormat;
  readonly metadata?: Record<string, unknown>;
}

export type TextFormat = 'plaintext' | 'markdown';
