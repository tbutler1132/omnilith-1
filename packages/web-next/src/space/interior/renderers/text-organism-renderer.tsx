/**
 * Text organism renderer.
 *
 * Displays text payloads for entered organisms in Space interiors.
 */

import { Fragment } from 'react';

interface TextOrganismPayload {
  readonly content?: unknown;
  readonly format?: unknown;
}

const HEADING_RE = /^(#{1,6})\s+(.+)$/;

function parseMarkdown(content: string) {
  const blocks = content.split(/\n\n+/);

  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    const heading = trimmed.match(HEADING_RE);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const Tag = `h${level}` as const;
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: static parsed blocks
        <Tag key={i} className={`text-heading-${level}`}>
          {heading[2]}
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

export function TextOrganismRenderer({ payload }: { payload: unknown }) {
  const textPayload = (payload ?? {}) as TextOrganismPayload;
  const content = typeof textPayload.content === 'string' ? textPayload.content : '';
  const format = textPayload.format === 'markdown' ? 'markdown' : 'plaintext';

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
