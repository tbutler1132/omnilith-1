/**
 * Write boundary guard — enforce HUD ownership of organism write actions.
 *
 * Write APIs must only be imported by HUD rendering modules or API adapters.
 * This keeps write affordances consistently routed through the visor surface.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WRITE_API_NAMES = new Set([
  'thresholdOrganism',
  'composeChild',
  'decomposeChild',
  'appendState',
  'openProposal',
  'integrateProposal',
  'declineProposal',
]);

const WRITE_IMPORT_PATTERN = /import\s*{([^}]*)}\s*from\s*['"][^'"]*api\/organisms\.js['"]/g;

function collectSourceFiles(dirPath: string): string[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(entryPath));
      continue;
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(entryPath);
    }
  }

  return files;
}

function importsOrganismWriteApi(sourceText: string): boolean {
  for (const match of sourceText.matchAll(WRITE_IMPORT_PATTERN)) {
    const imports = match[1].split(',').map((name) => name.trim());
    if (imports.some((importName) => WRITE_API_NAMES.has(importName))) {
      return true;
    }
  }
  return false;
}

describe('organism write boundary', () => {
  it('limits organism write API imports to HUD and API modules', () => {
    const srcRoot = fileURLToPath(new URL('../../../', import.meta.url));
    const sourceFiles = collectSourceFiles(srcRoot);

    const offenders = sourceFiles
      .filter((filePath) => {
        const relativePath = relative(srcRoot, filePath).replaceAll('\\', '/');
        if (relativePath.startsWith('hud/') || relativePath.startsWith('api/')) {
          return false;
        }
        const sourceText = readFileSync(filePath, 'utf8');
        return importsOrganismWriteApi(sourceText);
      })
      .map((filePath) => relative(srcRoot, filePath).replaceAll('\\', '/'));

    expect(offenders).toEqual([]);
  });
});
