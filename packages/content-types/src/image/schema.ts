/**
 * Image content type — schema for image organisms.
 */

export interface ImagePayload {
  readonly fileReference: string;
  readonly width: number;
  readonly height: number;
  readonly format: ImageFormat;
  readonly metadata?: Record<string, unknown>;
}

export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp' | 'svg';

export const IMAGE_FORMATS: ReadonlySet<string> = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
