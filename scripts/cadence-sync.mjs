#!/usr/bin/env node

/**
 * Cadence export + sync CLI.
 *
 * Lets stewards export cadence organisms into local files and sync local edits
 * back to the API using governance-aware write paths.
 */

import process from "node:process";
import { runCadenceExport, runCadenceSync } from "./cadence-sync-lib.mjs";

const VALID_COMMANDS = new Set(["export", "sync"]);

function printUsage() {
  console.log(`
Usage:
  node scripts/cadence-sync.mjs export --path <directory> [options]
  node scripts/cadence-sync.mjs sync --path <directory> [--dry-run | --apply] [options]

Options:
  --path <directory>            Local cadence directory (required)
  --api <baseUrl>               API base URL (default: http://localhost:3000)
  --target personal             Resolve target from /auth/me personalOrganismId (default)
  --target-organism-id <id>     Explicit target organism id
  --session <token>             Session token (overrides env/file)
  --email <email>               Login fallback email if session token not available
  --password-env <name>         Password env var name for login fallback (default: OMNILITH_PASSWORD)
  --dry-run                     Preview sync changes without writes (default for sync)
  --apply                       Apply sync writes and update manifest
  --help                        Show this help

Session token precedence:
  1) --session
  2) OMNILITH_SESSION_ID
  3) <path>/.omnilith/session
  4) login fallback via --email + --password-env
`.trim());
}

function parseArgs(argv) {
  const command = argv[2];
  if (!VALID_COMMANDS.has(command)) {
    throw new Error(`Invalid or missing command "${command ?? ""}". Expected "export" or "sync".`);
  }

  const options = {
    command,
    path: undefined,
    apiBaseUrl: "http://localhost:3000",
    targetMode: "personal",
    targetOrganismId: undefined,
    sessionId: undefined,
    email: undefined,
    passwordEnv: undefined,
    apply: false
  };

  for (let index = 3; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--") {
      continue;
    }

    if (token === "--help") {
      options.help = true;
      continue;
    }

    if (token === "--path") {
      options.path = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--api") {
      options.apiBaseUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--target") {
      const mode = argv[index + 1];
      if (mode !== "personal") {
        throw new Error(`Unsupported --target value "${mode}". Use "personal" or --target-organism-id.`);
      }
      options.targetMode = "personal";
      index += 1;
      continue;
    }

    if (token === "--target-organism-id") {
      options.targetMode = "organism-id";
      options.targetOrganismId = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--session") {
      options.sessionId = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--email") {
      options.email = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--password-env") {
      options.passwordEnv = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--dry-run") {
      options.apply = false;
      continue;
    }

    if (token === "--apply") {
      options.apply = true;
      continue;
    }

    throw new Error(`Unknown argument "${token}".`);
  }

  if (options.help) {
    return options;
  }

  if (typeof options.path !== "string" || options.path.trim().length === 0) {
    throw new Error("--path is required.");
  }

  if (options.targetMode === "organism-id" && (!options.targetOrganismId || options.targetOrganismId.trim().length === 0)) {
    throw new Error("--target-organism-id is required when target mode is organism-id.");
  }

  return options;
}

function printHeader(outcome) {
  console.log("");
  console.log(`cadence:${outcome.operation}`);
  console.log(`  root: ${outcome.rootPath}`);
  console.log(`  api: ${outcome.apiBaseUrl}`);
  console.log(`  target: ${outcome.targetMode} (${outcome.targetOrganismId})`);
  if (outcome.manifestPath) {
    console.log(`  manifest: ${outcome.manifestPath}`);
  }
  if (outcome.operation === "sync") {
    console.log(`  mode: ${outcome.apply ? "apply" : "dry-run"}`);
  }
  console.log("");
}

function printResults(outcome) {
  for (const row of outcome.results) {
    const details = [];
    if (row.stateId) details.push(`state=${row.stateId}`);
    if (row.proposalId) details.push(`proposal=${row.proposalId}`);
    if (row.detail) details.push(row.detail);
    const suffix = details.length > 0 ? ` (${details.join("; ")})` : "";
    console.log(`  ${row.tabId.padEnd(10)} ${row.status}${suffix}`);
  }
  console.log("");
}

function printSummary(summary) {
  const keys = Object.keys(summary);
  console.log("summary:");
  for (const key of keys) {
    console.log(`  ${key}: ${summary[key]}`);
  }
  console.log("");
}

function shouldExitNonZero(outcome) {
  if (outcome.operation !== "sync") {
    return false;
  }

  return outcome.summary.conflict > 0 || outcome.summary.error > 0;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.length <= 2) {
    printUsage();
    process.exit(0);
  }

  let options;
  try {
    options = parseArgs(process.argv);
  } catch (error) {
    console.error(`cadence-sync: ${error.message}`);
    console.error("");
    printUsage();
    process.exit(1);
  }

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  try {
    const outcome =
      options.command === "export"
        ? await runCadenceExport({
            path: options.path,
            apiBaseUrl: options.apiBaseUrl,
            targetMode: options.targetMode,
            targetOrganismId: options.targetOrganismId,
            sessionId: options.sessionId,
            email: options.email,
            passwordEnv: options.passwordEnv
          })
        : await runCadenceSync({
            path: options.path,
            apiBaseUrl: options.apiBaseUrl,
            targetMode: options.targetMode,
            targetOrganismId: options.targetOrganismId,
            sessionId: options.sessionId,
            email: options.email,
            passwordEnv: options.passwordEnv,
            apply: options.apply
          });

    printHeader(outcome);
    printResults(outcome);
    if (outcome.summary) {
      printSummary(outcome.summary);
    }

    if (shouldExitNonZero(outcome)) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`cadence-sync: ${error.message}`);
    process.exit(1);
  }
}

await main();
