#!/usr/bin/env node
/**
 * Web dependency graph generator — interactive architecture map for web source.
 *
 * Scans packages/web/src, extracts file-level import edges, and emits a
 * self-contained HTML report with graph, filtering, and intent-header details.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webSrcDir = resolve(rootDir, 'packages/web/src');
const defaultOutputPath = resolve(rootDir, 'tmp/reports/web-dependency-graph.html');

const importSpecifierRegexes = [
  /(?:import|export)\s[^'"]*?\sfrom\s*['"]([^'"]+)['"]/g,
  /(?:import|export)\s*['"]([^'"]+)['"]/g,
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts'];

function parseOutputPathFromArgs() {
  const outIndex = process.argv.findIndex((arg) => arg === '--out');
  if (outIndex === -1) return defaultOutputPath;
  const outputValue = process.argv[outIndex + 1];
  if (!outputValue) return defaultOutputPath;
  return resolve(rootDir, outputValue);
}

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

    if (!sourceExtensions.includes(extname(fullPath))) continue;
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

function resolveRelativeImportPath(filePath, specifier) {
  const importPath = resolve(dirname(filePath), specifier);
  const jsExtensionMatch = importPath.match(/\.(?:cjs|mjs|js)$/);
  const candidates = [importPath];

  if (jsExtensionMatch) {
    const withoutJsExtension = importPath.slice(0, -jsExtensionMatch[0].length);
    for (const extension of sourceExtensions) {
      candidates.push(`${withoutJsExtension}${extension}`);
    }
  } else if (!/\.[^/]+$/.test(importPath)) {
    for (const extension of sourceExtensions) {
      candidates.push(`${importPath}${extension}`);
    }
  }

  for (const extension of sourceExtensions) {
    candidates.push(resolve(importPath, `index${extension}`));
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

function extractIntentHeader(sourceText) {
  const headerMatch = sourceText.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (!headerMatch) return { title: null, summary: null, fullText: null };

  const cleanedLines = headerMatch[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trimEnd())
    .map((line) => line.trim())
    .filter((line, index, lines) => {
      if (line.length > 0) return true;
      const hasPrevious = lines.slice(0, index).some((item) => item.length > 0);
      const hasNext = lines.slice(index + 1).some((item) => item.length > 0);
      return hasPrevious && hasNext;
    });

  if (cleanedLines.length === 0) return { title: null, summary: null, fullText: null };

  const title = cleanedLines[0] ?? null;
  const emptyLineIndex = cleanedLines.findIndex((line) => line.length === 0);
  const summaryLines = emptyLineIndex === -1 ? cleanedLines : cleanedLines.slice(0, emptyLineIndex);
  const summary = summaryLines.join(' ').trim() || null;
  const fullText = cleanedLines.join('\n').trim() || null;

  return { title, summary, fullText };
}

function getZone(fileId) {
  const firstSegment = fileId.split('/')[0];
  return firstSegment || '(root)';
}

function escapeForScriptTag(value) {
  return value.replace(/<\/script/gi, '<\\/script');
}

function buildGraphData() {
  const files = listSourceFiles(webSrcDir);
  const idByAbsolutePath = new Map();
  const sourceById = new Map();

  for (const filePath of files) {
    const fileId = toPosixPath(relative(webSrcDir, filePath));
    idByAbsolutePath.set(filePath, fileId);
    sourceById.set(fileId, readFileSync(filePath, 'utf8'));
  }

  const rawNodes = [];
  const edges = [];
  const edgeSet = new Set();

  for (const [fileId, sourceText] of sourceById.entries()) {
    const absolutePath = resolve(webSrcDir, fileId);
    const intent = extractIntentHeader(sourceText);
    const specifiers = parseImportSpecifiers(sourceText);
    const internalImports = [];
    const externalImports = [];

    for (const specifier of specifiers) {
      if (specifier.startsWith('.')) {
        const resolvedImportPath = resolveRelativeImportPath(absolutePath, specifier);
        if (!resolvedImportPath) continue;

        const relativeToWebSrc = relative(webSrcDir, resolvedImportPath);
        if (relativeToWebSrc.startsWith('..') || relativeToWebSrc.startsWith('../')) continue;
        if (isTestFile(resolvedImportPath)) continue;
        if (!sourceExtensions.includes(extname(resolvedImportPath))) continue;

        const targetId = toPosixPath(relativeToWebSrc);
        if (!sourceById.has(targetId)) continue;

        internalImports.push(targetId);
        const edgeId = `${fileId}->${targetId}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({ source: fileId, target: targetId });
        }
        continue;
      }

      externalImports.push(specifier);
    }

    rawNodes.push({
      id: fileId,
      zone: getZone(fileId),
      title: intent.title,
      summary: intent.summary,
      intentHeader: intent.fullText,
      internalImports: Array.from(new Set(internalImports)).sort((a, b) => a.localeCompare(b)),
      externalImports: Array.from(new Set(externalImports)).sort((a, b) => a.localeCompare(b)),
    });
  }

  const importedByMap = new Map(rawNodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    importedByMap.get(edge.target)?.push(edge.source);
  }

  const nodes = rawNodes
    .map((node) => {
      const importedBy = Array.from(new Set(importedByMap.get(node.id) ?? [])).sort((a, b) => a.localeCompare(b));
      return {
        ...node,
        importedBy,
        internalImportCount: node.internalImports.length,
        importedByCount: importedBy.length,
        externalImportCount: node.externalImports.length,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const zoneCounts = new Map();
  for (const node of nodes) {
    zoneCounts.set(node.zone, (zoneCounts.get(node.zone) ?? 0) + 1);
  }

  const zoneEdges = new Map();
  for (const edge of edges) {
    const sourceNode = nodes.find((node) => node.id === edge.source);
    const targetNode = nodes.find((node) => node.id === edge.target);
    if (!sourceNode || !targetNode) continue;
    const key = `${sourceNode.zone}->${targetNode.zone}`;
    zoneEdges.set(key, (zoneEdges.get(key) ?? 0) + 1);
  }

  const zoneEdgeRows = Array.from(zoneEdges.entries())
    .map(([key, count]) => {
      const [sourceZone, targetZone] = key.split('->');
      return { sourceZone, targetZone, count };
    })
    .sort(
      (a, b) =>
        a.sourceZone.localeCompare(b.sourceZone) || a.targetZone.localeCompare(b.targetZone) || b.count - a.count,
    );

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: 'packages/web/src',
    summary: {
      fileCount: nodes.length,
      edgeCount: edges.length,
      zoneCount: zoneCounts.size,
      externalImportCount: nodes.reduce((count, node) => count + node.externalImports.length, 0),
    },
    zones: Array.from(zoneCounts.entries())
      .map(([zone, fileCount]) => ({ zone, fileCount }))
      .sort((a, b) => b.fileCount - a.fileCount || a.zone.localeCompare(b.zone)),
    zoneEdges: zoneEdgeRows,
    nodes,
    edges,
  };
}

function buildHtmlReport(graphData) {
  const graphDataScript = escapeForScriptTag(JSON.stringify(graphData));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Web Dependency Graph</title>
    <style>
      :root {
        --bg: #f7f8fa;
        --panel: #ffffff;
        --line: #dde2ea;
        --text: #1d2433;
        --muted: #54607a;
        --accent: #1f6feb;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 20px;
        font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      h1, h2, h3 {
        margin: 0 0 10px;
      }
      .meta {
        color: var(--muted);
        font-size: 14px;
      }
      .summary {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 12px 0 16px;
      }
      .chip {
        background: #eef3ff;
        border: 1px solid #d3e0ff;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 13px;
      }
      .controls {
        display: grid;
        grid-template-columns: 1fr 180px auto;
        gap: 8px;
        margin-bottom: 12px;
      }
      .controls input,
      .controls select,
      .controls button {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 10px;
        background: var(--panel);
        font-size: 14px;
      }
      .controls button {
        cursor: pointer;
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(260px, 0.9fr) minmax(500px, 1.5fr) minmax(320px, 1fr);
        gap: 12px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px;
        min-height: 520px;
      }
      .panel h2 {
        font-size: 17px;
      }
      .list {
        height: 470px;
        overflow: auto;
        margin: 8px 0 0;
        padding: 0;
        list-style: none;
        border-top: 1px solid var(--line);
      }
      .list-item {
        display: block;
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        border-bottom: 1px solid #edf1f6;
        padding: 9px 8px;
        cursor: pointer;
        font-family: inherit;
      }
      .list-item:hover {
        background: #f6f9ff;
      }
      .list-item.active {
        background: #e9f0ff;
      }
      .node-path {
        display: block;
        font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
        font-size: 12px;
      }
      .node-meta {
        color: var(--muted);
        font-size: 12px;
      }
      .graph-wrap {
        width: 100%;
        height: 500px;
        overflow: auto;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fbfcfe;
      }
      svg {
        display: block;
      }
      .detail {
        border-top: 1px solid var(--line);
        padding-top: 10px;
        margin-top: 8px;
      }
      .detail h3 {
        margin: 10px 0 4px;
        font-size: 14px;
      }
      .detail pre {
        white-space: pre-wrap;
        margin: 0;
        font-size: 12px;
        line-height: 1.4;
        color: #28334d;
        background: #f7f9fd;
        border: 1px solid #e5eaf4;
        border-radius: 8px;
        padding: 8px;
      }
      .detail-list {
        margin: 4px 0 0;
        padding: 0;
        list-style: none;
      }
      .detail-list li {
        padding: 4px 0;
        border-bottom: 1px dotted #edf1f6;
        font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
        font-size: 12px;
      }
      .zone-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }
      .zone-table th,
      .zone-table td {
        border-bottom: 1px solid #edf1f6;
        text-align: left;
        padding: 6px;
        font-size: 12px;
      }
      @media (max-width: 1200px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <h1>Web Dependency Graph</h1>
    <div class="meta">Source: <code>packages/web/src</code> | Generated: <span id="generatedAt"></span></div>
    <div id="summary" class="summary"></div>

    <div class="controls">
      <input id="searchInput" type="search" placeholder="Search file path, zone, or intent header text" />
      <select id="zoneFilter"></select>
      <button id="clearFilters">Reset Filters</button>
    </div>

    <div class="layout">
      <section class="panel">
        <h2>Modules</h2>
        <div class="meta" id="visibleCount"></div>
        <ul id="nodeList" class="list"></ul>
      </section>

      <section class="panel">
        <h2>Dependency Graph</h2>
        <div class="graph-wrap">
          <svg id="graphSvg"></svg>
        </div>
      </section>

      <section class="panel">
        <h2>Module Details</h2>
        <div id="details" class="detail"></div>
      </section>
    </div>

    <section class="panel" style="min-height: 180px; margin-top: 12px;">
      <h2>Zone Dependency Edges</h2>
      <table class="zone-table">
        <thead>
          <tr>
            <th>Source zone</th>
            <th>Target zone</th>
            <th>Edge count</th>
          </tr>
        </thead>
        <tbody id="zoneEdgeRows"></tbody>
      </table>
    </section>

    <script>
      const DATA = ${graphDataScript};

      const graphSvg = document.getElementById('graphSvg');
      const searchInput = document.getElementById('searchInput');
      const zoneFilter = document.getElementById('zoneFilter');
      const nodeList = document.getElementById('nodeList');
      const details = document.getElementById('details');
      const generatedAt = document.getElementById('generatedAt');
      const visibleCount = document.getElementById('visibleCount');
      const summary = document.getElementById('summary');
      const zoneEdgeRows = document.getElementById('zoneEdgeRows');
      const clearFilters = document.getElementById('clearFilters');

      const zonePalette = [
        '#1f6feb', '#e67e22', '#2e9d72', '#c0392b', '#8e44ad', '#0f9ac8', '#c27c0e', '#5f7f98', '#2f5a3d',
      ];

      const zoneColorById = new Map();
      DATA.zones.forEach((zoneRecord, index) => {
        zoneColorById.set(zoneRecord.zone, zonePalette[index % zonePalette.length]);
      });

      const nodeById = new Map(DATA.nodes.map((node) => [node.id, node]));
      let selectedNodeId = DATA.nodes[0]?.id ?? null;

      function fillSummary() {
        generatedAt.textContent = DATA.generatedAt;
        const chips = [
          ['files', DATA.summary.fileCount],
          ['edges', DATA.summary.edgeCount],
          ['zones', DATA.summary.zoneCount],
          ['external imports', DATA.summary.externalImportCount],
        ];
        summary.innerHTML = chips.map(([label, value]) => '<span class="chip"><strong>' + value + '</strong> ' + label + '</span>').join('');
      }

      function fillZoneFilter() {
        const options = ['<option value="">All zones</option>']
          .concat(DATA.zones.map((zoneRecord) => '<option value="' + zoneRecord.zone + '">' + zoneRecord.zone + ' (' + zoneRecord.fileCount + ')</option>'));
        zoneFilter.innerHTML = options.join('');
      }

      function matchesFilter(node, search, zone) {
        const searchValue = search.trim().toLowerCase();
        const zoneMatches = !zone || node.zone === zone;
        if (!zoneMatches) return false;
        if (!searchValue) return true;

        const haystack = [
          node.id,
          node.zone,
          node.title || '',
          node.summary || '',
          node.intentHeader || '',
          node.internalImports.join(' '),
          node.importedBy.join(' '),
          node.externalImports.join(' '),
        ].join('\\n').toLowerCase();

        return haystack.includes(searchValue);
      }

      function getVisibleNodes() {
        const zone = zoneFilter.value;
        const search = searchInput.value;
        return DATA.nodes.filter((node) => matchesFilter(node, search, zone));
      }

      function ensureSelectedNode(visibleNodes) {
        if (selectedNodeId && visibleNodes.some((node) => node.id === selectedNodeId)) return;
        selectedNodeId = visibleNodes[0]?.id ?? null;
      }

      function renderNodeList(visibleNodes) {
        visibleCount.textContent = 'Showing ' + visibleNodes.length + ' of ' + DATA.nodes.length + ' files';
        nodeList.innerHTML = visibleNodes
          .map((node) => {
            const activeClass = node.id === selectedNodeId ? ' active' : '';
            return (
              '<li><button class="list-item' + activeClass + '" data-node-id="' + node.id + '">' +
                '<span class="node-path">' + node.id + '</span>' +
                '<span class="node-meta">' + node.zone + ' | out ' + node.internalImportCount + ' | in ' + node.importedByCount + '</span>' +
              '</button></li>'
            );
          })
          .join('');

        nodeList.querySelectorAll('button[data-node-id]').forEach((button) => {
          button.addEventListener('click', () => {
            selectedNodeId = button.getAttribute('data-node-id');
            rerender();
          });
        });
      }

      function renderDetails(node) {
        if (!node) {
          details.innerHTML = '<div class="meta">No module selected.</div>';
          return;
        }

        const intentText = node.intentHeader || 'No intent header found.';
        const imports = node.internalImports.map((item) => '<li>' + item + '</li>').join('') || '<li>none</li>';
        const importedBy = node.importedBy.map((item) => '<li>' + item + '</li>').join('') || '<li>none</li>';
        const external = node.externalImports.map((item) => '<li>' + item + '</li>').join('') || '<li>none</li>';

        details.innerHTML =
          '<div><strong>' + node.id + '</strong></div>' +
          '<div class="meta">zone: ' + node.zone + ' | out: ' + node.internalImportCount + ' | in: ' + node.importedByCount + '</div>' +
          '<h3>Intent Header</h3><pre>' + intentText + '</pre>' +
          '<h3>Internal Imports</h3><ul class="detail-list">' + imports + '</ul>' +
          '<h3>Imported By</h3><ul class="detail-list">' + importedBy + '</ul>' +
          '<h3>External Imports</h3><ul class="detail-list">' + external + '</ul>';
      }

      function renderZoneEdges() {
        zoneEdgeRows.innerHTML = DATA.zoneEdges
          .map((row) => '<tr><td>' + row.sourceZone + '</td><td>' + row.targetZone + '</td><td>' + row.count + '</td></tr>')
          .join('');
      }

      function renderGraph(visibleNodes) {
        const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
        const visibleEdges = DATA.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));

        const zoneOrder = Array.from(new Set(visibleNodes.map((node) => node.zone))).sort((a, b) => a.localeCompare(b));
        const nodesByZone = new Map(zoneOrder.map((zone) => [zone, []]));
        visibleNodes.forEach((node) => nodesByZone.get(node.zone).push(node));
        zoneOrder.forEach((zone) => nodesByZone.get(zone).sort((a, b) => a.id.localeCompare(b.id)));

        const maxZoneSize = Math.max(1, ...Array.from(nodesByZone.values()).map((nodes) => nodes.length));
        const width = Math.max(760, zoneOrder.length * 240);
        const height = Math.max(420, maxZoneSize * 24 + 90);
        graphSvg.setAttribute('width', String(width));
        graphSvg.setAttribute('height', String(height));

        const positions = new Map();
        zoneOrder.forEach((zone, zoneIndex) => {
          const zoneNodes = nodesByZone.get(zone);
          const x = 110 + zoneIndex * ((width - 220) / Math.max(1, zoneOrder.length - 1));
          zoneNodes.forEach((node, nodeIndex) => {
            const y = 56 + nodeIndex * 24;
            positions.set(node.id, { x, y });
          });
        });

        const selected = selectedNodeId ? nodeById.get(selectedNodeId) : null;
        const selectedAdjacency = new Set();
        if (selected) {
          selectedAdjacency.add(selected.id);
          selected.internalImports.forEach((id) => selectedAdjacency.add(id));
          selected.importedBy.forEach((id) => selectedAdjacency.add(id));
        }

        const parts = [];
        zoneOrder.forEach((zone, zoneIndex) => {
          const x = 110 + zoneIndex * ((width - 220) / Math.max(1, zoneOrder.length - 1));
          parts.push('<text x="' + x + '" y="22" text-anchor="middle" fill="#495979" font-size="12">' + zone + '</text>');
          parts.push('<line x1="' + x + '" y1="30" x2="' + x + '" y2="' + (height - 12) + '" stroke="#eef2f8" stroke-width="1" />');
        });

        visibleEdges.forEach((edge) => {
          const sourcePoint = positions.get(edge.source);
          const targetPoint = positions.get(edge.target);
          if (!sourcePoint || !targetPoint) return;

          const edgeTouchesSelection = selected && (edge.source === selected.id || edge.target === selected.id);
          const opacity = selected ? (edgeTouchesSelection ? 0.85 : 0.08) : 0.2;
          const stroke = edgeTouchesSelection ? '#1f6feb' : '#91a0ba';
          parts.push(
            '<line x1="' + sourcePoint.x + '" y1="' + sourcePoint.y + '" x2="' + targetPoint.x + '" y2="' + targetPoint.y +
            '" stroke="' + stroke + '" stroke-opacity="' + opacity + '" stroke-width="1.3" />'
          );
        });

        visibleNodes.forEach((node) => {
          const point = positions.get(node.id);
          if (!point) return;

          const color = zoneColorById.get(node.zone) || '#5f7f98';
          const isSelected = node.id === selectedNodeId;
          const radius = isSelected ? 6.2 : 4.2;
          const opacity = selected ? (selectedAdjacency.has(node.id) ? 1 : 0.26) : 0.9;
          const stroke = isSelected ? '#0c2d61' : '#ffffff';
          parts.push(
            '<circle class="graph-node" data-node-id="' + node.id + '" cx="' + point.x + '" cy="' + point.y + '" r="' + radius +
            '" fill="' + color + '" fill-opacity="' + opacity + '" stroke="' + stroke + '" stroke-width="1.3">' +
            '<title>' + node.id + ' | out ' + node.internalImportCount + ' | in ' + node.importedByCount + '</title></circle>'
          );
        });

        if (selected && positions.has(selected.id)) {
          const point = positions.get(selected.id);
          parts.push('<text x="' + (point.x + 10) + '" y="' + (point.y - 8) + '" fill="#22324c" font-size="11">' + selected.id + '</text>');
        }

        graphSvg.innerHTML = parts.join('');
        graphSvg.querySelectorAll('.graph-node').forEach((circle) => {
          circle.style.cursor = 'pointer';
          circle.addEventListener('click', () => {
            selectedNodeId = circle.getAttribute('data-node-id');
            rerender();
          });
        });
      }

      function rerender() {
        const visibleNodes = getVisibleNodes();
        ensureSelectedNode(visibleNodes);
        renderNodeList(visibleNodes);
        renderGraph(visibleNodes);
        renderDetails(selectedNodeId ? nodeById.get(selectedNodeId) : null);
      }

      searchInput.addEventListener('input', rerender);
      zoneFilter.addEventListener('change', rerender);
      clearFilters.addEventListener('click', () => {
        searchInput.value = '';
        zoneFilter.value = '';
        rerender();
      });

      fillSummary();
      fillZoneFilter();
      renderZoneEdges();
      rerender();
    </script>
  </body>
</html>`;
}

function main() {
  const outputPath = parseOutputPathFromArgs();
  const outputDir = dirname(outputPath);
  mkdirSync(outputDir, { recursive: true });

  const graphData = buildGraphData();
  const html = buildHtmlReport(graphData);
  writeFileSync(outputPath, html, 'utf8');

  const relativeOutputPath = toPosixPath(relative(rootDir, outputPath));
  console.log(`Web dependency graph written to ${relativeOutputPath}`);
}

main();
