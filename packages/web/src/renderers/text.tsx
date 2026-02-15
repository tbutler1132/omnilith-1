/**
 * Text renderer — displays text/markdown content.
 *
 * Handles plaintext as paragraphs and markdown with a lightweight
 * parser covering headings and blank-line-separated paragraphs.
 * Line breaks within paragraphs are preserved (for poetry stanzas).
 */

import { Fragment } from 'react';
import type { RendererProps } from './registry.js';

interface TextPayload {
  content: string;
  format: 'plaintext' | 'markdown';
}

const HEADING_RE = /^(#{1,6})\s+(.+)$/;

function parseMarkdown(content: string) {
  const blocks = content.split(/\n\n+/);

  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const text = headingMatch[2];
      const Tag = `h${level}` as const;
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: static parsed blocks
        <Tag key={i} className={`text-heading-${level}`}>
          {text}
        </Tag>
      );
    }

    const lines = trimmed.split('\n');
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: static parsed blocks
      <p key={i} className="text-paragraph">
        {lines.map((line, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static text lines
          <Fragment key={j}>
            {j > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </p>
    );
  });
}

export function TextRenderer({ state, zoom: _zoom, focused: _focused }: RendererProps) {
  const payload = state.payload as TextPayload;
  const content = payload?.content ?? '';
  const format = payload?.format ?? 'plaintext';

  if (format === 'markdown') {
    return <div className="text-renderer">{parseMarkdown(content)}</div>;
  }

  return (
    <div className="text-renderer">
      {content.split('\n\n').map((paragraph, i) => {
        const lines = paragraph.trim().split('\n');
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static text lines don't reorder
          <p key={i} className="text-paragraph">
            {lines.map((line, j) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static text lines
              <Fragment key={j}>
                {j > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
