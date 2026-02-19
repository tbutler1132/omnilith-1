#!/usr/bin/env node
/**
 * Intent headers check — enforce module intent comments.
 *
 * Modules should start with a short comment that states what the module is
 * and why it exists. This checker scans source files and reports modules
 * missing that intent header.
 *
 * The baseline file lets teams adopt this incrementally while still blocking
 * new missing headers.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = resolve(rootDir, 'packages');
const baselinePath = resolve(rootDir, 'scripts/intent-header-baseline.json');

const useStrictMode = process.argv.includes('--strict');
const updateBaseline = process.argv.includes('--update-baseline');
const filesFileArgIndex = process.argv.indexOf('--files-file');

let filesFilePath = null;
if (filesFileArgIndex !== -1) {
  const candidate = process.argv[filesFileArgIndex + 1];
  if (!candidate) {
    console.error('Missing value for --files-file');
    process.exit(1);
  }
  filesFilePath = resolve(rootDir, candidate);
}

if (updateBaseline && filesFilePath) {
  console.error('--update-baseline cannot be combined with --files-file');
  process.exit(1);
}

function toPosixPath(filePath) {
  return filePath.split(sep).join('/');
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

    files.push(fullPath);
  }

  return files;
}

function shouldCheckFile(filePath) {
  const extension = extname(filePath);
  if (!['.ts', '.tsx', '.mts', '.cts'].includes(extension)) return false;

  const fileName = basename(filePath);
  if (fileName.endsWith('.d.ts')) return false;
  if (fileName === 'index.ts' || fileName === 'index.tsx') return false;
  if (/(\.test|\.spec)\.(ts|tsx|mts|cts)$/.test(fileName)) return false;

  return true;
}

function firstMeaningfulLine(sourceText) {
  for (const rawLine of sourceText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#!')) continue;
    return line;
  }

  return '';
}

function hasIntentHeader(sourceText) {
  return firstMeaningfulLine(sourceText).startsWith('/**');
}

function readBaseline() {
  if (!existsSync(baselinePath)) return new Set();

  const parsed = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const entries = Array.isArray(parsed?.missingIntentHeaders) ? parsed.missingIntentHeaders : [];
  return new Set(entries);
}

function writeBaseline(entries) {
  const payload = { missingIntentHeaders: entries };
  writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function readFileFilterSet() {
  if (!filesFilePath) return null;
  if (!existsSync(filesFilePath)) {
    console.error(`Files list not found: ${toPosixPath(relative(rootDir, filesFilePath))}`);
    process.exit(1);
  }

  const lines = readFileSync(filesFilePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\.\//, ''))
    .map(toPosixPath);

  return new Set(lines);
}

const missingHeaders = [];
const fileFilterSet = readFileFilterSet();
let checkedFileCount = 0;
const packageDirs = readdirSync(packagesDir).filter((name) => statSync(resolve(packagesDir, name)).isDirectory());

for (const packageDirName of packageDirs) {
  const srcDir = resolve(packagesDir, packageDirName, 'src');
  const files = listSourceFiles(srcDir).filter(shouldCheckFile);

  for (const filePath of files) {
    const relativePath = toPosixPath(relative(rootDir, filePath));
    if (fileFilterSet && !fileFilterSet.has(relativePath)) continue;

    checkedFileCount += 1;
    const sourceText = readFileSync(filePath, 'utf8');

    if (!hasIntentHeader(sourceText)) {
      missingHeaders.push(relativePath);
    }
  }
}

missingHeaders.sort();

if (updateBaseline) {
  writeBaseline(missingHeaders);
  console.log(`Updated ${toPosixPath(relative(rootDir, baselinePath))} with ${missingHeaders.length} entries.`);
  process.exit(0);
}

if (useStrictMode) {
  if (missingHeaders.length > 0) {
    console.error('Intent header violations found (strict mode):\n');
    for (const filePath of missingHeaders) {
      console.error(`- ${filePath}`);
    }
    process.exit(1);
  }

  if (fileFilterSet) {
    console.log(`Intent headers check passed (strict mode, ${checkedFileCount} changed modules checked).`);
  } else {
    console.log('Intent headers check passed (strict mode).');
  }
  process.exit(0);
}

const baselineEntries = readBaseline();
const newViolations = missingHeaders.filter((filePath) => !baselineEntries.has(filePath));
const resolvedEntries =
  fileFilterSet === null ? [...baselineEntries].filter((filePath) => !missingHeaders.includes(filePath)).sort() : [];

if (newViolations.length > 0) {
  console.error('New intent header violations found:\n');
  for (const filePath of newViolations) {
    console.error(`- ${filePath}`);
  }
  console.error('\nRun `pnpm run intent-headers:update-baseline` if these are intentional.');
  process.exit(1);
}

if (resolvedEntries.length > 0) {
  console.warn('Intent header baseline has resolved entries:\n');
  for (const filePath of resolvedEntries) {
    console.warn(`- ${filePath}`);
  }
  console.warn('\nConsider refreshing with `pnpm run intent-headers:update-baseline`.');
}

if (fileFilterSet) {
  console.log(
    `Intent headers check passed (${checkedFileCount} changed modules checked, ${missingHeaders.length} missing, ${newViolations.length} new).`,
  );
} else {
  console.log(
    `Intent headers check passed (${missingHeaders.length} missing tracked in baseline, ${newViolations.length} new).`,
  );
}
