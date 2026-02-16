#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4173;
const DEFAULT_RUNS = 3;

function parseArgs(argv) {
  const opts = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    runs: DEFAULT_RUNS,
    build: true,
    saveBaseline: false,
    comparePath: null,
    outDir: null,
    sessionId: process.env.OMNILITH_SESSION_ID ?? null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--host') opts.host = argv[++i];
    else if (a === '--port') opts.port = Number(argv[++i]);
    else if (a === '--runs') opts.runs = Number(argv[++i]);
    else if (a === '--no-build') opts.build = false;
    else if (a === '--save-baseline') opts.saveBaseline = true;
    else if (a === '--compare') opts.comparePath = argv[++i] ?? 'tmp/profiling/baseline-summary.json';
    else if (a === '--out-dir') opts.outDir = argv[++i];
    else if (a === '--session-id') opts.sessionId = argv[++i];
  }

  return opts;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function waitForPort(host, port, timeoutMs = 15_000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    function attempt() {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.once('timeout', () => socket.destroy());
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
        } else {
          setTimeout(attempt, 250);
        }
      });

      socket.connect(port, host);
    }

    attempt();
  });
}

function median(values) {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

function extractMetrics(report) {
  const read = (id) => report?.audits?.[id]?.numericValue ?? null;
  return {
    score: Math.round((report?.categories?.performance?.score ?? 0) * 100),
    fcp_ms: Math.round(read('first-contentful-paint') ?? 0),
    lcp_ms: Math.round(read('largest-contentful-paint') ?? 0),
    tbt_ms: Math.round(read('total-blocking-time') ?? 0),
    cls: Number((read('cumulative-layout-shift') ?? 0).toFixed(3)),
    si_ms: Math.round(read('speed-index') ?? 0),
    inp_ms: (() => {
      const v = read('interaction-to-next-paint') ?? read('experimental-interaction-to-next-paint');
      return v == null ? null : Math.round(v);
    })(),
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const root = path.resolve(process.cwd());
  const tmpRoot = path.join(root, 'tmp', 'profiling');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(root, opts.outDir ?? path.join(tmpRoot, `run-${timestamp}`));
  const baselinePath = path.resolve(root, 'tmp', 'profiling', 'baseline-summary.json');
  const comparePath = opts.comparePath ? path.resolve(root, opts.comparePath) : null;
  const url = `http://${opts.host}:${opts.port}/`;
  const chromePath = chromium.executablePath();
  const chromeUserDataDir = path.join(outDir, 'chrome-profile');

  await fs.mkdir(outDir, { recursive: true });

  if (opts.build) {
    await runCommand('pnpm', ['build']);
  }

  const preview = spawn('pnpm', ['preview', '--host', opts.host, '--port', String(opts.port)], {
    stdio: 'inherit',
    shell: false,
  });

  try {
    await waitForPort(opts.host, opts.port);

    if (opts.sessionId) {
      const ctx = await chromium.launchPersistentContext(chromeUserDataDir, {
        executablePath: chromePath,
        headless: true,
      });
      try {
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.evaluate((sessionId) => {
          localStorage.setItem('sessionId', sessionId);
        }, opts.sessionId);
      } finally {
        await ctx.close();
      }
    }

    for (let i = 1; i <= opts.runs; i += 1) {
      const reportPath = path.join(outDir, `lighthouse-${i}.json`);
      const chromeFlags = opts.sessionId ? `--user-data-dir=${chromeUserDataDir}` : '';
      await runCommand('pnpm', [
        'exec',
        'lighthouse',
        url,
        '--chrome-path',
        chromePath,
        '--preset=desktop',
        '--only-categories=performance',
        '--quiet',
        ...(chromeFlags ? ['--chrome-flags', chromeFlags] : []),
        '--output=json',
        '--output-path',
        reportPath,
      ]);
    }
  } finally {
    preview.kill('SIGINT');
  }

  const reports = await Promise.all(
    Array.from({ length: opts.runs }, async (_, idx) => {
      const reportPath = path.join(outDir, `lighthouse-${idx + 1}.json`);
      const raw = await fs.readFile(reportPath, 'utf8');
      return JSON.parse(raw);
    }),
  );

  const runs = reports.map((r, idx) => ({
    run: idx + 1,
    ...extractMetrics(r),
  }));

  const summary = {
    generatedAt: new Date().toISOString(),
    url,
    runs,
    median: {
      score: median(runs.map((r) => r.score)),
      fcp_ms: median(runs.map((r) => r.fcp_ms)),
      lcp_ms: median(runs.map((r) => r.lcp_ms)),
      tbt_ms: median(runs.map((r) => r.tbt_ms)),
      cls: median(runs.map((r) => r.cls)),
      si_ms: median(runs.map((r) => r.si_ms)),
      inp_ms: median(runs.map((r) => r.inp_ms)),
    },
    authenticated: Boolean(opts.sessionId),
  };

  const summaryPath = path.join(outDir, 'summary.json');
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  if (opts.saveBaseline) {
    await fs.mkdir(path.dirname(baselinePath), { recursive: true });
    await fs.writeFile(baselinePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  }

  if (comparePath) {
    const baselineRaw = await fs.readFile(comparePath, 'utf8');
    const baseline = JSON.parse(baselineRaw);
    const delta = {};
    for (const k of ['score', 'fcp_ms', 'lcp_ms', 'tbt_ms', 'cls', 'si_ms', 'inp_ms']) {
      const cur = summary.median[k];
      const base = baseline?.median?.[k];
      delta[k] = cur != null && base != null ? Number((cur - base).toFixed(3)) : null;
    }
    const deltaPath = path.join(outDir, 'delta-vs-baseline.json');
    await fs.writeFile(
      deltaPath,
      `${JSON.stringify(
        {
          baseline: comparePath,
          currentSummary: summaryPath,
          delta,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    console.log(`\nDelta vs baseline written to ${deltaPath}`);
  }

  console.log(`\nLighthouse summary written to ${summaryPath}`);
  if (opts.saveBaseline) {
    console.log(`Baseline saved to ${baselinePath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
