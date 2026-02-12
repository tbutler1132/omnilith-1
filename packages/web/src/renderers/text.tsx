/**
 * Text renderer — displays text/markdown content.
 *
 * Phase 1: plaintext as paragraphs, markdown as preformatted.
 * Proper markdown rendering deferred.
 */

import type { RendererProps } from './registry.js';

interface TextPayload {
  content: string;
  format: 'plaintext' | 'markdown';
}

export function TextRenderer({ state }: RendererProps) {
  const payload = state.payload as TextPayload;
  const content = payload?.content ?? '';
  const format = payload?.format ?? 'plaintext';

  if (format === 'markdown') {
    return <pre>{content}</pre>;
  }

  return (
    <div>
      {content.split('\n').map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static text lines don't reorder
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}
