/**
 * Docs metadata guard — enforce top-level docs header fields.
 *
 * Keeps top-level documentation consistently machine-readable for
 * fresh agent sessions by requiring the same metadata keys.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REQUIRED_FIELDS = ['Status:', 'Updated:', 'Audience:', 'Canonicality:'] as const;

function readTopLevelDocs(): Array<{ name: string; content: string }> {
  const docsDir = fileURLToPath(new URL('../../../../docs', import.meta.url));
  const entries = readdirSync(docsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      name: entry.name,
      content: readFileSync(fileURLToPath(new URL(`../../../../docs/${entry.name}`, import.meta.url)), 'utf8'),
    }));
}

describe('top-level docs metadata header', () => {
  it('includes required metadata keys on every top-level docs markdown file', () => {
    const docs = readTopLevelDocs();
    expect(docs.length).toBeGreaterThan(0);

    docs.forEach(({ name, content }) => {
      const head = content.split('\n').slice(0, 18).join('\n');
      expect(head, `${name} must start with a markdown title`).toMatch(/^#\s+/m);

      REQUIRED_FIELDS.forEach((field) => {
        const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        expect(head, `${name} is missing ${field}`).toMatch(new RegExp(`^${escapedField}\\s+\\S`, 'm'));
      });
    });
  });
});
