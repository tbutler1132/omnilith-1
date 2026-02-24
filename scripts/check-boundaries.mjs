#!/usr/bin/env node
/**
 * Architecture boundaries check — enforce package import direction.
 *
 * Omnilith depends on strict zone boundaries across kernel, content-types,
 * api, and web packages. This script validates imports and fails when code
 * crosses package boundaries in ways the architecture does not allow.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = resolve(rootDir, 'packages');

const packageRules = {
  kernel: {
    allowedWorkspaceImports: [],
  },
  'content-types': {
    allowedWorkspaceImports: ['@omnilith/kernel'],
  },
  api: {
    allowedWorkspaceImports: ['@omnilith/kernel', '@omnilith/content-types'],
  },
  'web-next': {
    allowedWorkspaceImports: ['@omnilith/content-types'],
  },
};

const importSpecifierRegexes = [
  /(?:import|export)\s[^'"]*?\sfrom\s*['"]([^'"]+)['"]/g,
  /(?:import|export)\s*['"]([^'"]+)['"]/g,
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function listSourceFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    if (entry === 'dist' || entry === 'node_modules') continue;

    const fullPath = resolve(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.mts') || fullPath.endsWith('.cts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseImportSpecifiers(sourceText) {
  const specifiers = [];

  for (const regex of importSpecifierRegexes) {
    let match = regex.exec(sourceText);
    while (match !== null) {
      specifiers.push(match[1]);
      match = regex.exec(sourceText);
    }
  }

  return specifiers;
}

function getWorkspacePackageName(specifier) {
  if (!specifier.startsWith('@omnilith/')) return null;

  const segments = specifier.split('/');
  if (segments.length < 2) return null;
  return `${segments[0]}/${segments[1]}`;
}

function isPathInside(dir, candidate) {
  const rel = relative(dir, candidate);
  return rel !== '' && !rel.startsWith('..') && !rel.startsWith('../');
}

function resolveRelativeImportPath(filePath, specifier) {
  const importPath = resolve(dirname(filePath), specifier);
  const extensionCandidates = ['.ts', '.tsx', '.mts', '.cts'];
  const candidates = [importPath];
  const jsEntryPointMatch = importPath.match(/\.(?:cjs|mjs|js)$/);

  if (jsEntryPointMatch) {
    const withoutJsExtension = importPath.slice(0, -jsEntryPointMatch[0].length);
    for (const extension of extensionCandidates) {
      candidates.push(`${withoutJsExtension}${extension}`);
    }
  } else if (!/\.[^/]+$/.test(importPath)) {
    for (const extension of extensionCandidates) {
      candidates.push(`${importPath}${extension}`);
    }
  }

  for (const extension of extensionCandidates) {
    candidates.push(resolve(importPath, `index${extension}`));
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return importPath;
}

function getWebSourceZone(packageRelativePath) {
  const path = packageRelativePath.replaceAll('\\', '/');
  if (!path.startsWith('src/')) return null;
  if (path.startsWith('src/platform/')) return 'platform';
  if (path.startsWith('src/hud/')) return 'hud';
  if (path.startsWith('src/space/')) return 'space';
  if (path.startsWith('src/contracts/')) return 'contracts';
  return 'other';
}

function getWebLayerViolation({ packageRoot, importerFilePath, resolvedImportPath }) {
  const importerRelativePath = relative(packageRoot, importerFilePath).replaceAll('\\', '/');
  const importeeRelativePath = relative(packageRoot, resolvedImportPath).replaceAll('\\', '/');
  const importerZone = getWebSourceZone(importerRelativePath);
  const importeeZone = getWebSourceZone(importeeRelativePath);

  if (!importerZone || !importeeZone) return null;

  if (importerZone === 'platform') {
    const isPlatformOrchestrator =
      importerRelativePath === 'src/platform/Platform.tsx' ||
      importerRelativePath === 'src/platform/platform-shell.tsx';
    if (!isPlatformOrchestrator && (importeeZone === 'hud' || importeeZone === 'space')) {
      return `web-next platform internals cannot import ${importeeZone}; keep orchestration in src/platform/platform-shell.tsx`;
    }
  }

  if (importerZone === 'hud' && importeeZone === 'space') {
    return 'web-next hud cannot import space directly; coordinate through platform/contracts';
  }

  if (importerZone === 'space' && importeeZone === 'hud') {
    return 'web-next space cannot import hud directly; coordinate through platform/contracts';
  }

  if (importerZone === 'contracts' && ['platform', 'hud', 'space'].includes(importeeZone)) {
    return 'web-next contracts must stay neutral and cannot import platform/hud/space';
  }

  return null;
}

const violations = [];

for (const [packageName, rules] of Object.entries(packageRules)) {
  const packageRoot = resolve(packagesDir, packageName);
  const sourceRoot = resolve(packageRoot, 'src');
  const files = listSourceFiles(sourceRoot);

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf8');
    const specifiers = parseImportSpecifiers(source);

    for (const specifier of specifiers) {
      const workspacePackage = getWorkspacePackageName(specifier);

      if (workspacePackage) {
        if (!rules.allowedWorkspaceImports.includes(workspacePackage)) {
          violations.push({
            filePath,
            specifier,
            message: `${packageName} cannot import ${workspacePackage}`,
          });
        }
        continue;
      }

      if (specifier.startsWith('.')) {
        const resolvedImportPath = resolveRelativeImportPath(filePath, specifier);
        if (!isPathInside(packageRoot, resolvedImportPath)) {
          violations.push({
            filePath,
            specifier,
            message: `${packageName} cannot import files outside its package root`,
          });
        }

        if (packageName === 'web-next') {
          const webLayerViolation = getWebLayerViolation({
            packageRoot,
            importerFilePath: filePath,
            resolvedImportPath,
          });
          if (webLayerViolation) {
            violations.push({
              filePath,
              specifier,
              message: webLayerViolation,
            });
          }
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture boundary violations found:\n');
  for (const violation of violations) {
    const relFile = relative(rootDir, violation.filePath);
    console.error(`- ${relFile}: "${violation.specifier}" (${violation.message})`);
  }
  process.exit(1);
}

console.log('Architecture boundaries check passed.');
