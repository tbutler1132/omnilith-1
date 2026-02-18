/**
 * Panel rendering boundary guard — keep panel ID branching out of hosts.
 *
 * Adaptive hosts should route through registry contracts instead of
 * growing per-panel conditional branches.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function readRelative(relativePath: string): string {
  const absolutePath = fileURLToPath(new URL(relativePath, import.meta.url));
  return readFileSync(absolutePath, 'utf8');
}

describe('adaptive panel rendering boundary', () => {
  it('keeps map panel body routing out of AdaptiveVisorHost', () => {
    const source = readRelative('../../AdaptiveVisorHost.tsx');
    expect(source).toMatch(/renderMapPanelBody\(panelId\)/);
    expect(source).not.toMatch(/renderPanelBody=\{\(panelId\)\s*=>\s*{[\s\S]*panelId\s*===/);
  });

  it('keeps universal visor panel body routing out of VisorPanelBody', () => {
    const source = readRelative('./VisorPanelBody.tsx');
    expect(source).not.toMatch(/panelId\s*===/);
  });
});
