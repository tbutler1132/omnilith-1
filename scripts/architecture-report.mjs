#!/usr/bin/env node
/**
 * Architecture report — dependency map and boundary summary.
 *
 * Produces a quick architecture snapshot for local review or CI logs:
 * workspace package dependencies, observed source import edges, and
 * boundary violations against the package import rules.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = resolve(rootDir, 'packages');
const failOnViolations = process.argv.includes('--fail-on-violations');

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
  web: {
    allowedWorkspaceImports: ['@omnilith/content-types'],
  },
};

const importSpecifierRegexes = [
  /(?:import|export)\s[^'"]*?\sfrom\s*['"]([^'"]+)['"]/g,
  /(?:import|export)\s*['"]([^'"]+)['"]/g,
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function toPosixPath(filePath) {
  return filePath.split(sep).join('/');
}

function isTestFile(filePath) {
  return (
    filePath.includes('/__tests__/') ||
    filePath.includes('\\__tests__\\') ||
    /\.(test|spec)\.(ts|tsx|mts|cts)$/.test(filePath)
  );
}

function listSourceFiles(dir) {
  const files = [];

  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    if (entry === 'dist' || entry === 'node_modules' || entry === '__tests__') continue;

    const fullPath = resolve(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (!['.ts', '.tsx', '.mts', '.cts'].some((ext) => fullPath.endsWith(ext))) continue;
    if (fullPath.endsWith('.d.ts')) continue;
    if (isTestFile(fullPath)) continue;

    files.push(fullPath);
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

function readWorkspacePackages() {
  const directories = readdirSync(packagesDir).filter((entry) => statSync(resolve(packagesDir, entry)).isDirectory());
  const packages = [];

  for (const directoryName of directories) {
    const packageRoot = resolve(packagesDir, directoryName);
    const packageJsonPath = resolve(packageRoot, 'package.json');
    if (!existsSync(packageJsonPath)) continue;

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    packages.push({
      directoryName,
      packageName: packageJson.name,
      packageRoot,
      srcRoot: resolve(packageRoot, 'src'),
      packageJson,
    });
  }

  return packages.sort((a, b) => a.directoryName.localeCompare(b.directoryName));
}

function incrementNestedCount(counter, source, target) {
  if (!counter.has(source)) counter.set(source, new Map());
  const sourceMap = counter.get(source);
  sourceMap.set(target, (sourceMap.get(target) ?? 0) + 1);
}

const workspacePackages = readWorkspacePackages();
const packageNameToDirectory = new Map(workspacePackages.map((pkg) => [pkg.packageName, pkg.directoryName]));
const manifestDependencyMap = new Map();
const importEdgeCounts = new Map();
const violations = [];
let scannedFiles = 0;

for (const pkg of workspacePackages) {
  const dependencyFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  const allDependencies = {};

  for (const field of dependencyFields) {
    Object.assign(allDependencies, pkg.packageJson[field] ?? {});
  }

  const workspaceDependencies = Object.keys(allDependencies).filter((name) => packageNameToDirectory.has(name)).sort();
  manifestDependencyMap.set(pkg.directoryName, workspaceDependencies);

  const files = listSourceFiles(pkg.srcRoot);
  scannedFiles += files.length;

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf8');
    const specifiers = parseImportSpecifiers(source);

    for (const specifier of specifiers) {
      const workspacePackage = getWorkspacePackageName(specifier);

      if (workspacePackage) {
        const targetDirectory = packageNameToDirectory.get(workspacePackage) ?? workspacePackage.replace('@omnilith/', '');
        incrementNestedCount(importEdgeCounts, pkg.directoryName, targetDirectory);

        const rules = packageRules[pkg.directoryName];
        if (rules && !rules.allowedWorkspaceImports.includes(workspacePackage)) {
          violations.push({
            filePath: toPosixPath(relative(rootDir, filePath)),
            specifier,
            message: `${pkg.directoryName} cannot import ${workspacePackage}`,
          });
        }

        continue;
      }

      if (specifier.startsWith('.')) {
        const resolvedImportPath = resolve(dirname(filePath), specifier);
        if (!isPathInside(pkg.packageRoot, resolvedImportPath)) {
          violations.push({
            filePath: toPosixPath(relative(rootDir, filePath)),
            specifier,
            message: `${pkg.directoryName} cannot import files outside its package root`,
          });
        }
      }
    }
  }
}

const totalImportEdges = [...importEdgeCounts.values()].reduce(
  (sum, targetMap) => sum + [...targetMap.values()].reduce((innerSum, count) => innerSum + count, 0),
  0,
);

const reportLines = [];
reportLines.push('# Architecture Report');
reportLines.push('');
reportLines.push(`Generated: ${new Date().toISOString()}`);
reportLines.push('');
reportLines.push('## Package Dependency Map');
reportLines.push('');
reportLines.push('| Package | Workspace dependencies |');
reportLines.push('| --- | --- |');

for (const pkg of workspacePackages) {
  const deps = manifestDependencyMap.get(pkg.directoryName) ?? [];
  reportLines.push(`| \`${pkg.directoryName}\` | ${deps.length > 0 ? deps.map((d) => `\`${d}\``).join(', ') : 'none'} |`);
}

reportLines.push('');
reportLines.push('## Observed Import Graph');
reportLines.push('');
reportLines.push('| Source package | Target package | Import count |');
reportLines.push('| --- | --- | ---: |');

const edgeRows = [];
for (const [sourcePackage, targets] of importEdgeCounts.entries()) {
  for (const [targetPackage, count] of targets.entries()) {
    edgeRows.push({ sourcePackage, targetPackage, count });
  }
}

edgeRows.sort(
  (a, b) =>
    a.sourcePackage.localeCompare(b.sourcePackage) ||
    a.targetPackage.localeCompare(b.targetPackage) ||
    b.count - a.count,
);

if (edgeRows.length === 0) {
  reportLines.push('| none | none | 0 |');
} else {
  for (const edge of edgeRows) {
    reportLines.push(`| \`${edge.sourcePackage}\` | \`${edge.targetPackage}\` | ${edge.count} |`);
  }
}

reportLines.push('');
reportLines.push('## Boundary Summary');
reportLines.push('');
reportLines.push(`- Files scanned: ${scannedFiles}`);
reportLines.push(`- Workspace import edges: ${totalImportEdges}`);
reportLines.push(`- Violations: ${violations.length}`);

if (violations.length > 0) {
  reportLines.push('');
  reportLines.push('### Violations');
  reportLines.push('');
  for (const violation of violations) {
    reportLines.push(`- \`${violation.filePath}\` imports \`${violation.specifier}\` (${violation.message})`);
  }
}

console.log(reportLines.join('\n'));

if (failOnViolations && violations.length > 0) {
  process.exit(1);
}
