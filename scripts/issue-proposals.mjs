#!/usr/bin/env node

/**
 * Issue proposal operations.
 *
 * This script keeps the AI contribution lane proposal-first.
 * It validates issue proposal files and synchronizes accepted proposals
 * into GitHub issues after the proposal is merged.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PROPOSALS_DIR = process.env.ISSUE_PROPOSALS_DIR ?? ".github/issue-proposals";
const LEGACY_PROPOSALS_FILE = process.env.ISSUE_PROPOSALS_FILE ?? ".github/issue-proposals.json";
const DEFAULT_LABELS = (process.env.ISSUE_PROPOSAL_DEFAULT_LABELS ?? "agent")
  .split(",")
  .map((label) => label.trim())
  .filter((label) => label.length > 0);
const VALID_COMMANDS = new Set(["validate", "sync"]);

function fail(message) {
  console.error(`issue-proposals: ${message}`);
  process.exit(1);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function validateProposal(proposal, sourcePath) {
  if (!isPlainObject(proposal)) {
    fail(`${sourcePath} must contain a JSON object.`);
  }

  if (typeof proposal.proposalId !== "string" || proposal.proposalId.length === 0) {
    fail(`${sourcePath}: proposalId must be a non-empty string.`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(proposal.proposalId)) {
    fail(`${sourcePath}: proposalId must be kebab-case (lowercase letters, numbers, dashes).`);
  }

  if (typeof proposal.title !== "string" || proposal.title.trim().length < 5) {
    fail(`${sourcePath}: title must be a string with at least 5 characters.`);
  }

  if (proposal.title.length > 120) {
    fail(`${sourcePath}: title must be 120 characters or fewer.`);
  }

  if (typeof proposal.body !== "string" || proposal.body.trim().length < 20) {
    fail(`${sourcePath}: body must be a string with at least 20 characters.`);
  }

  if (proposal.labels !== undefined) {
    if (!Array.isArray(proposal.labels)) {
      fail(`${sourcePath}: labels must be an array of strings when provided.`);
    }

    for (const label of proposal.labels) {
      if (typeof label !== "string" || label.trim().length === 0) {
        fail(`${sourcePath}: labels entries must be non-empty strings.`);
      }
    }
  }

  if (proposal.openedBy !== undefined && typeof proposal.openedBy !== "string") {
    fail(`${sourcePath}: openedBy must be a string when provided.`);
  }

  if (proposal.aiAuthored !== undefined && typeof proposal.aiAuthored !== "boolean") {
    fail(`${sourcePath}: aiAuthored must be a boolean when provided.`);
  }
}

async function parseJsonFile(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    fail(`could not parse ${filePath}: ${error.message}`);
  }
}

async function loadProposalsFromDirectory() {
  const fileNames = await readdir(PROPOSALS_DIR);
  const proposalFiles = fileNames
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const proposals = [];

  for (const fileName of proposalFiles) {
    const filePath = path.join(PROPOSALS_DIR, fileName);
    const proposal = await parseJsonFile(filePath);

    validateProposal(proposal, filePath);
    proposals.push({ ...proposal, __sourcePath: filePath });
  }

  return proposals;
}

async function loadProposalsFromLegacyFile() {
  const parsed = await parseJsonFile(LEGACY_PROPOSALS_FILE);

  if (!isPlainObject(parsed)) {
    fail(`${LEGACY_PROPOSALS_FILE} must contain a top-level JSON object.`);
  }

  if (!Array.isArray(parsed.proposals)) {
    fail(`${LEGACY_PROPOSALS_FILE} must contain a top-level "proposals" array.`);
  }

  return parsed.proposals.map((proposal, index) => {
    const sourcePath = `${LEGACY_PROPOSALS_FILE}#proposals[${index}]`;
    validateProposal(proposal, sourcePath);
    return { ...proposal, __sourcePath: sourcePath };
  });
}

async function loadAndValidateProposals() {
  const hasDirectory = await pathExists(PROPOSALS_DIR);
  const hasLegacyFile = await pathExists(LEGACY_PROPOSALS_FILE);

  let proposals;

  if (hasDirectory) {
    proposals = await loadProposalsFromDirectory();
  } else if (hasLegacyFile) {
    proposals = await loadProposalsFromLegacyFile();
  } else {
    fail(`no proposal source found. Expected ${PROPOSALS_DIR}/ or ${LEGACY_PROPOSALS_FILE}.`);
  }

  const proposalIdToSource = new Map();

  for (const proposal of proposals) {
    const previousSource = proposalIdToSource.get(proposal.proposalId);

    if (previousSource) {
      fail(
        `duplicate proposalId "${proposal.proposalId}" found in ${previousSource} and ${proposal.__sourcePath}.`
      );
    }

    proposalIdToSource.set(proposal.proposalId, proposal.__sourcePath);
  }

  return proposals.map(({ __sourcePath, ...proposal }) => proposal);
}

async function githubRequest({ token, method, path, body }) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "omnilith-issue-proposals-script",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function ensureLabelExists({ token, owner, repo, label }) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/labels`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "omnilith-issue-proposals-script",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      name: label,
      color: "0e8a16",
      description: "Created by issue proposal sync automation."
    })
  });

  if (response.status === 201 || response.status === 422) {
    return;
  }

  const text = await response.text();
  throw new Error(`failed to ensure label "${label}" (${response.status}): ${text}`);
}

async function issueExists({ token, owner, repo, proposalId }) {
  const query = encodeURIComponent(`repo:${owner}/${repo} is:issue in:body \"proposal-id:${proposalId}\"`);
  const result = await githubRequest({
    token,
    method: "GET",
    path: `/search/issues?q=${query}`
  });

  return result.total_count > 0;
}

function issueBody(proposal) {
  const metadata = [
    "---",
    "origin: issue-proposal",
    `proposal-id:${proposal.proposalId}`,
    `opened-by:${proposal.openedBy ?? "unknown"}`,
    `ai-authored:${proposal.aiAuthored === true ? "true" : "false"}`
  ].join("\n");

  return `${proposal.body.trim()}\n\n${metadata}`;
}

function resolveIssueLabels(proposal) {
  const labels = [
    ...DEFAULT_LABELS,
    ...(proposal.labels ?? []),
    ...(proposal.aiAuthored === true ? ["ai-authored"] : [])
  ];

  const uniqueLabels = new Set(labels.map((label) => label.trim()).filter((label) => label.length > 0));
  return Array.from(uniqueLabels);
}

async function syncProposals() {
  const proposals = await loadAndValidateProposals();
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!token) {
    fail("GITHUB_TOKEN is required for sync.");
  }

  if (!repository || !repository.includes("/")) {
    fail("GITHUB_REPOSITORY must be set to owner/repo for sync.");
  }

  const [owner, repo] = repository.split("/");
  let created = 0;
  let skipped = 0;

  for (const proposal of proposals) {
    const exists = await issueExists({ token, owner, repo, proposalId: proposal.proposalId });

    if (exists) {
      skipped += 1;
      console.log(`skip ${proposal.proposalId}: issue already exists`);
      continue;
    }

    const labels = resolveIssueLabels(proposal);

    for (const label of labels) {
      await ensureLabelExists({ token, owner, repo, label });
    }

    await githubRequest({
      token,
      method: "POST",
      path: `/repos/${owner}/${repo}/issues`,
      body: {
        title: proposal.title,
        body: issueBody(proposal),
        labels
      }
    });

    created += 1;
    console.log(`created issue for ${proposal.proposalId}`);
  }

  console.log(`sync complete: created=${created}, skipped=${skipped}, total=${proposals.length}`);
}

async function main() {
  const command = process.argv[2] ?? "validate";

  if (!VALID_COMMANDS.has(command)) {
    fail(`unknown command "${command}". Use one of: ${Array.from(VALID_COMMANDS).join(", ")}.`);
  }

  if (command === "validate") {
    const proposals = await loadAndValidateProposals();
    console.log(`validation complete: ${proposals.length} proposal(s).`);
    return;
  }

  await syncProposals();
}

main().catch((error) => fail(error.message));
