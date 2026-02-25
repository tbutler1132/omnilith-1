/**
 * Cadence markdown preview.
 *
 * Renders heading, list, paragraph, and table blocks so cadence markdown is
 * scannable from the open visor app without showing raw markdown syntax.
 */

import type { ReactNode } from 'react';
import styles from './cadence-app.module.css';

interface CadenceMarkdownPreviewProps {
  readonly content: string;
  readonly className?: string;
}

interface TableBlock {
  readonly headers: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
}

const MAX_PREVIEW_LINES = 42;
const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const UNORDERED_LIST_RE = /^[-*]\s+/;
const TASK_LIST_RE = /^-\s+\[[ xX]\]\s+/;

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
}

function parseTableCells(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparatorRow(cells: ReadonlyArray<string>): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableBlock(lines: ReadonlyArray<string>): TableBlock | null {
  const rows = lines.map(parseTableCells).filter((cells) => cells.length > 0);
  if (rows.length === 0) {
    return null;
  }

  let headerIndex = -1;
  for (let i = 0; i < rows.length; i += 1) {
    if (!isTableSeparatorRow(rows[i])) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return null;
  }

  const headers = rows[headerIndex];
  const bodyRows = rows.slice(headerIndex + 1).filter((cells) => !isTableSeparatorRow(cells));
  return { headers, rows: bodyRows };
}

function normalizePreviewLines(content: string): string[] {
  return content
    .split('\n')
    .slice(0, MAX_PREVIEW_LINES)
    .map((line) => line.trimEnd());
}

function normalizeListItem(line: string): string {
  if (TASK_LIST_RE.test(line)) {
    return line.replace(TASK_LIST_RE, '').trim();
  }
  return line.replace(UNORDERED_LIST_RE, '').trim();
}

function renderMarkdownBlocks(lines: ReadonlyArray<string>): ReactNode[] {
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (line.length === 0) {
      index += 1;
      continue;
    }

    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const clampedLevel = Math.min(level, 3);
      blocks.push(
        <div key={`heading-${index}`} className={resolveHeadingClassName(clampedLevel)}>
          {headingMatch[2].trim()}
        </div>,
      );
      index += 1;
      continue;
    }

    if (isTableLine(line)) {
      const tableLines: string[] = [];
      while (index < lines.length && isTableLine(lines[index].trim())) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const table = parseTableBlock(tableLines);
      if (table) {
        blocks.push(
          <div key={`table-${index}`} className={styles.markdownTableWrap}>
            <table className={styles.markdownTable}>
              <thead>
                <tr>
                  {table.headers.map((header, headerIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static parsed heading cells
                    <th key={headerIndex}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static parsed rows
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static parsed cells
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      continue;
    }

    if (UNORDERED_LIST_RE.test(line)) {
      const items: string[] = [];
      while (index < lines.length && UNORDERED_LIST_RE.test(lines[index].trim())) {
        const item = normalizeListItem(lines[index].trim());
        if (item.length > 0) {
          items.push(item);
        }
        index += 1;
      }

      if (items.length > 0) {
        blocks.push(
          <ul key={`list-${index}`} className={styles.markdownList}>
            {items.map((item, itemIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static parsed list items
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>,
        );
      }
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (!candidate || HEADING_RE.test(candidate) || UNORDERED_LIST_RE.test(candidate) || isTableLine(candidate)) {
        break;
      }
      paragraphLines.push(candidate);
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push(
        <p key={`paragraph-${index}`} className={styles.markdownParagraph}>
          {paragraphLines.join(' ')}
        </p>,
      );
      continue;
    }

    index += 1;
  }

  return blocks;
}

export function CadenceMarkdownPreview({ content, className }: CadenceMarkdownPreviewProps) {
  const lines = normalizePreviewLines(content);
  const blocks = renderMarkdownBlocks(lines);

  if (blocks.length === 0) {
    return null;
  }

  return <div className={className ? `${styles.markdownPreview} ${className}` : styles.markdownPreview}>{blocks}</div>;
}

function resolveHeadingClassName(level: number): string {
  if (level <= 1) {
    return `${styles.markdownHeading} ${styles.markdownHeadingLevel1}`;
  }

  if (level === 2) {
    return `${styles.markdownHeading} ${styles.markdownHeadingLevel2}`;
  }

  return `${styles.markdownHeading} ${styles.markdownHeadingLevel3}`;
}
