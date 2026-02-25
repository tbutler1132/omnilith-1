/**
 * Cadence local-first sync operations.
 *
 * Provides shared export and sync primitives for cadence text organisms so
 * stewards can tend cadence through filesystem files while preserving
 * governance-aware API write paths.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const CADENCE_TAB_IDS = ["trajectory", "variables", "models", "retros", "tasks", "inbox"];

const CADENCE_TAB_CONFIG = {
  trajectory: { fileName: "trajectory.md", nameSuffix: "-trajectory" },
  variables: { fileName: "variables.md", nameSuffix: "-variables" },
  models: { fileName: "models.md", nameSuffix: "-models" },
  retros: { fileName: "retros.md", nameSuffix: "-retros" },
  tasks: { fileName: "tasks.md", nameSuffix: "-tasks" },
  inbox: { fileName: "inbox.md", nameSuffix: "-inbox" }
};

const MANIFEST_DIRECTORY = ".omnilith";
const MANIFEST_FILE_NAME = "cadence-manifest.json";
const SESSION_FILE_NAME = "session";
const MANIFEST_VERSION = "1";

function normalizeApiBaseUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "http://localhost:3000";
  }

  return value.trim().replace(/\/+$/, "");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function mapCadenceTabIdFromName(name) {
  const normalizedName = name.trim().toLowerCase();

  for (const tabId of CADENCE_TAB_IDS) {
    const { nameSuffix } = CADENCE_TAB_CONFIG[tabId];
    if (normalizedName.endsWith(nameSuffix)) {
      return tabId;
    }
  }

  return undefined;
}

function resolveManifestPath(rootPath) {
  return path.join(rootPath, MANIFEST_DIRECTORY, MANIFEST_FILE_NAME);
}

function resolveSessionPath(rootPath) {
  return path.join(rootPath, MANIFEST_DIRECTORY, SESSION_FILE_NAME);
}

function validateCadenceChild(tabId, childRecord) {
  if (!isPlainObject(childRecord)) {
    throw new Error(`Cadence child "${tabId}" is not a valid record.`);
  }

  const organism = childRecord.organism;
  const currentState = childRecord.currentState;

  if (!isPlainObject(organism)) {
    throw new Error(`Cadence child "${tabId}" is missing organism data.`);
  }

  if (!isPlainObject(currentState)) {
    throw new Error(`Cadence child "${tabId}" is missing current state.`);
  }

  if (typeof currentState.contentTypeId !== "string" || currentState.contentTypeId !== "text") {
    throw new Error(`Cadence child "${tabId}" is not text content type.`);
  }

  if (!isPlainObject(currentState.payload)) {
    throw new Error(`Cadence child "${tabId}" has invalid payload.`);
  }

  if (typeof currentState.payload.content !== "string") {
    throw new Error(`Cadence child "${tabId}" payload content is not a string.`);
  }

  if (typeof organism.id !== "string" || organism.id.length === 0) {
    throw new Error(`Cadence child "${tabId}" is missing organism id.`);
  }

  if (typeof organism.name !== "string" || organism.name.length === 0) {
    throw new Error(`Cadence child "${tabId}" is missing organism name.`);
  }

  if (typeof organism.openTrunk !== "boolean") {
    throw new Error(`Cadence child "${tabId}" is missing openTrunk state.`);
  }

  if (typeof currentState.id !== "string" || currentState.id.length === 0) {
    throw new Error(`Cadence child "${tabId}" is missing state id.`);
  }

  if (typeof currentState.sequenceNumber !== "number") {
    throw new Error(`Cadence child "${tabId}" is missing state sequence number.`);
  }
}

async function apiRequest({ apiBaseUrl, sessionId, method = "GET", requestPath, body }) {
  const headers = {
    Accept: "application/json"
  };

  if (sessionId) {
    headers.Authorization = `Bearer ${sessionId}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${apiBaseUrl}${requestPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const rawText = await response.text();
  let payload = null;
  if (rawText.length > 0) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = { raw: rawText };
    }
  }

  if (!response.ok) {
    const reason = payload && typeof payload.error === "string" ? payload.error : rawText || "request failed";
    throw new Error(`${method} ${requestPath} failed (${response.status}): ${reason}`);
  }

  return payload;
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveSessionId({ apiBaseUrl, rootPath, sessionId, email, password, passwordEnv }) {
  if (typeof sessionId === "string" && sessionId.trim().length > 0) {
    return sessionId.trim();
  }

  if (typeof process.env.OMNILITH_SESSION_ID === "string" && process.env.OMNILITH_SESSION_ID.trim().length > 0) {
    return process.env.OMNILITH_SESSION_ID.trim();
  }

  const sessionPath = resolveSessionPath(rootPath);
  if (await pathExists(sessionPath)) {
    const candidate = (await readFile(sessionPath, "utf8")).trim();
    if (candidate.length > 0) {
      return candidate;
    }
  }

  if (typeof email === "string" && email.trim().length > 0) {
    const directPassword = typeof password === "string" && password.length > 0 ? password : undefined;
    const envName = typeof passwordEnv === "string" && passwordEnv.trim().length > 0 ? passwordEnv.trim() : "OMNILITH_PASSWORD";
    const envPassword = process.env[envName];
    const resolvedPassword = directPassword ?? (typeof envPassword === "string" ? envPassword : undefined);
    if (typeof resolvedPassword !== "string" || resolvedPassword.length === 0) {
      throw new Error(`Missing password value for login fallback (direct password or env "${envName}").`);
    }

    const loginResponse = await apiRequest({
      apiBaseUrl,
      method: "POST",
      requestPath: "/auth/login",
      body: {
        email: email.trim(),
        password: resolvedPassword
      }
    });

    if (!isPlainObject(loginResponse) || typeof loginResponse.sessionId !== "string" || loginResponse.sessionId.length === 0) {
      throw new Error("Login fallback did not return sessionId.");
    }

    return loginResponse.sessionId;
  }

  throw new Error(
    "Unable to resolve session token. Provide --session, set OMNILITH_SESSION_ID, add .omnilith/session, or pass --email with --password-env."
  );
}

async function resolveTargetOrganismId({ apiBaseUrl, sessionId, targetMode, targetOrganismId }) {
  if (targetMode === "organism-id") {
    if (typeof targetOrganismId !== "string" || targetOrganismId.trim().length === 0) {
      throw new Error("Missing --target-organism-id for target mode organism-id.");
    }

    return {
      targetMode,
      targetOrganismId: targetOrganismId.trim()
    };
  }

  const meResponse = await apiRequest({
    apiBaseUrl,
    sessionId,
    method: "GET",
    requestPath: "/auth/me"
  });

  if (!isPlainObject(meResponse) || typeof meResponse.personalOrganismId !== "string" || meResponse.personalOrganismId.length === 0) {
    throw new Error("Could not resolve personal organism from /auth/me.");
  }

  return {
    targetMode: "personal",
    targetOrganismId: meResponse.personalOrganismId
  };
}

async function fetchCadenceChildren({ apiBaseUrl, sessionId, targetOrganismId }) {
  const response = await apiRequest({
    apiBaseUrl,
    sessionId,
    method: "GET",
    requestPath: `/organisms/${targetOrganismId}/children-with-state`
  });

  if (!isPlainObject(response) || !Array.isArray(response.children)) {
    throw new Error("Invalid response from children-with-state endpoint.");
  }

  const byTabId = {};
  const duplicateTabs = [];

  for (const child of response.children) {
    if (!isPlainObject(child) || !isPlainObject(child.organism)) {
      continue;
    }

    const tabId = mapCadenceTabIdFromName(child.organism.name ?? "");
    if (!tabId) {
      continue;
    }

    if (byTabId[tabId]) {
      duplicateTabs.push(tabId);
      continue;
    }

    validateCadenceChild(tabId, child);

    const payload = child.currentState.payload;
    byTabId[tabId] = {
      tabId,
      fileName: CADENCE_TAB_CONFIG[tabId].fileName,
      organismId: child.organism.id,
      organismName: child.organism.name,
      openTrunk: child.organism.openTrunk,
      stateId: child.currentState.id,
      sequenceNumber: child.currentState.sequenceNumber,
      contentTypeId: child.currentState.contentTypeId,
      payload,
      content: payload.content
    };
  }

  if (duplicateTabs.length > 0) {
    throw new Error(`Found duplicate cadence child tabs: ${Array.from(new Set(duplicateTabs)).join(", ")}`);
  }

  const missingTabs = CADENCE_TAB_IDS.filter((tabId) => !byTabId[tabId]);
  if (missingTabs.length > 0) {
    throw new Error(`Missing cadence children for tabs: ${missingTabs.join(", ")}.`);
  }

  return byTabId;
}

function buildManifest({ apiBaseUrl, targetMode, targetOrganismId, cadenceChildrenByTab }) {
  const entries = {};

  for (const tabId of CADENCE_TAB_IDS) {
    const cadenceChild = cadenceChildrenByTab[tabId];
    entries[tabId] = {
      tabId,
      organismId: cadenceChild.organismId,
      organismName: cadenceChild.organismName,
      openTrunk: cadenceChild.openTrunk,
      lastKnownStateId: cadenceChild.stateId,
      lastKnownSequenceNumber: cadenceChild.sequenceNumber,
      lastExportedContentSha256: sha256(cadenceChild.content)
    };
  }

  return {
    version: MANIFEST_VERSION,
    apiBaseUrl,
    target: {
      mode: targetMode,
      organismId: targetMode === "organism-id" ? targetOrganismId : undefined
    },
    generatedAt: new Date().toISOString(),
    entries
  };
}

async function writeManifest(rootPath, manifest) {
  const manifestDir = path.join(rootPath, MANIFEST_DIRECTORY);
  const manifestPath = resolveManifestPath(rootPath);
  await mkdir(manifestDir, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function loadManifest(rootPath) {
  const manifestPath = resolveManifestPath(rootPath);
  if (!(await pathExists(manifestPath))) {
    throw new Error(`Manifest not found at ${manifestPath}. Run cadence:export first.`);
  }

  const raw = await readFile(manifestPath, "utf8");
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse manifest JSON: ${error.message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error("Cadence manifest must be an object.");
  }

  if (parsed.version !== MANIFEST_VERSION) {
    throw new Error(`Unsupported manifest version "${parsed.version}". Expected "${MANIFEST_VERSION}".`);
  }

  if (!isPlainObject(parsed.entries)) {
    throw new Error("Cadence manifest is missing entries.");
  }

  for (const tabId of CADENCE_TAB_IDS) {
    if (!isPlainObject(parsed.entries[tabId])) {
      throw new Error(`Cadence manifest entry missing for "${tabId}".`);
    }
  }

  return parsed;
}

function buildUpdatedPayload(payload, content) {
  if (!isPlainObject(payload)) {
    throw new Error("Cannot update non-object payload.");
  }

  return {
    ...payload,
    content
  };
}

function ensureString(value, message) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(message);
  }

  return value;
}

function ensureNumber(value, message) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(message);
  }

  return value;
}

async function appendState({ apiBaseUrl, sessionId, organismId, payload }) {
  const response = await apiRequest({
    apiBaseUrl,
    sessionId,
    method: "POST",
    requestPath: `/organisms/${organismId}/states`,
    body: {
      contentTypeId: "text",
      payload
    }
  });

  if (!isPlainObject(response) || !isPlainObject(response.state)) {
    throw new Error(`Append state response missing state for organism ${organismId}.`);
  }

  return response.state;
}

async function openProposal({ apiBaseUrl, sessionId, organismId, organismName, payload }) {
  const response = await apiRequest({
    apiBaseUrl,
    sessionId,
    method: "POST",
    requestPath: `/organisms/${organismId}/proposals`,
    body: {
      mutation: {
        kind: "append-state",
        contentTypeId: "text",
        payload
      },
      description: `Cadence update for ${organismName}.`
    }
  });

  if (!isPlainObject(response) || !isPlainObject(response.proposal)) {
    throw new Error(`Open proposal response missing proposal for organism ${organismId}.`);
  }

  return response.proposal;
}

export async function runCadenceExport(input) {
  const rootPath = path.resolve(input.path);
  const apiBaseUrl = normalizeApiBaseUrl(input.apiBaseUrl);
  const sessionId = await resolveSessionId({
    apiBaseUrl,
    rootPath,
    sessionId: input.sessionId,
    email: input.email,
    password: input.password,
    passwordEnv: input.passwordEnv
  });

  const targetResolution = await resolveTargetOrganismId({
    apiBaseUrl,
    sessionId,
    targetMode: input.targetMode,
    targetOrganismId: input.targetOrganismId
  });

  const cadenceChildrenByTab = await fetchCadenceChildren({
    apiBaseUrl,
    sessionId,
    targetOrganismId: targetResolution.targetOrganismId
  });

  const results = [];
  for (const tabId of CADENCE_TAB_IDS) {
    const child = cadenceChildrenByTab[tabId];
    const filePath = path.join(rootPath, child.fileName);
    await writeFile(filePath, child.content, "utf8");
    results.push({
      tabId,
      filePath,
      organismId: child.organismId,
      organismName: child.organismName,
      status: "exported"
    });
  }

  const manifest = buildManifest({
    apiBaseUrl,
    targetMode: targetResolution.targetMode,
    targetOrganismId: targetResolution.targetOrganismId,
    cadenceChildrenByTab
  });

  await writeManifest(rootPath, manifest);

  return {
    operation: "export",
    rootPath,
    apiBaseUrl,
    targetMode: targetResolution.targetMode,
    targetOrganismId: targetResolution.targetOrganismId,
    manifestPath: resolveManifestPath(rootPath),
    results
  };
}

function compareAgainstManifest({ tabId, manifest, localContentHash, remoteState }) {
  const entry = manifest.entries[tabId];
  const manifestStateId = ensureString(entry.lastKnownStateId, `Manifest entry "${tabId}" is missing lastKnownStateId.`);
  const manifestSequenceNumber = ensureNumber(
    entry.lastKnownSequenceNumber,
    `Manifest entry "${tabId}" is missing lastKnownSequenceNumber.`
  );
  const manifestContentHash = ensureString(
    entry.lastExportedContentSha256,
    `Manifest entry "${tabId}" is missing lastExportedContentSha256.`
  );

  const localChanged = localContentHash !== manifestContentHash;
  const remoteChanged = remoteState.stateId !== manifestStateId || remoteState.sequenceNumber !== manifestSequenceNumber;

  return { localChanged, remoteChanged };
}

function cloneManifest(manifest) {
  return JSON.parse(JSON.stringify(manifest));
}

function alignManifestMetadata(manifest, { apiBaseUrl, targetMode, targetOrganismId }) {
  manifest.apiBaseUrl = apiBaseUrl;
  manifest.target = {
    mode: targetMode,
    organismId: targetMode === "organism-id" ? targetOrganismId : undefined
  };
  manifest.generatedAt = new Date().toISOString();
}

export async function runCadenceSync(input) {
  const rootPath = path.resolve(input.path);
  const apiBaseUrl = normalizeApiBaseUrl(input.apiBaseUrl);
  const apply = input.apply === true;
  const sessionId = await resolveSessionId({
    apiBaseUrl,
    rootPath,
    sessionId: input.sessionId,
    email: input.email,
    password: input.password,
    passwordEnv: input.passwordEnv
  });

  const manifest = await loadManifest(rootPath);
  const mutableManifest = cloneManifest(manifest);

  const targetResolution = await resolveTargetOrganismId({
    apiBaseUrl,
    sessionId,
    targetMode: input.targetMode,
    targetOrganismId: input.targetOrganismId
  });

  if (
    mutableManifest.target?.mode === "organism-id" &&
    targetResolution.targetMode === "organism-id" &&
    mutableManifest.target.organismId !== targetResolution.targetOrganismId
  ) {
    throw new Error(
      `Target organism mismatch. Manifest has "${mutableManifest.target.organismId}", but command resolved "${targetResolution.targetOrganismId}".`
    );
  }

  const cadenceChildrenByTab = await fetchCadenceChildren({
    apiBaseUrl,
    sessionId,
    targetOrganismId: targetResolution.targetOrganismId
  });

  const results = [];

  for (const tabId of CADENCE_TAB_IDS) {
    const child = cadenceChildrenByTab[tabId];
    const filePath = path.join(rootPath, child.fileName);
    const rowBase = {
      tabId,
      filePath,
      organismId: child.organismId,
      organismName: child.organismName
    };

    let localContent;
    try {
      localContent = await readFile(filePath, "utf8");
    } catch (error) {
      results.push({
        ...rowBase,
        status: "error",
        detail: `Failed to read local file: ${error.message}`
      });
      continue;
    }

    const localContentHash = sha256(localContent);

    let comparison;
    try {
      comparison = compareAgainstManifest({
        tabId,
        manifest: mutableManifest,
        localContentHash,
        remoteState: child
      });
    } catch (error) {
      results.push({
        ...rowBase,
        status: "error",
        detail: error.message
      });
      continue;
    }

    const { localChanged, remoteChanged } = comparison;

    if (!localChanged && !remoteChanged) {
      results.push({
        ...rowBase,
        status: "unchanged"
      });
      continue;
    }

    if (!localChanged && remoteChanged) {
      if (apply) {
        await writeFile(filePath, child.content, "utf8");
        mutableManifest.entries[tabId].lastKnownStateId = child.stateId;
        mutableManifest.entries[tabId].lastKnownSequenceNumber = child.sequenceNumber;
        mutableManifest.entries[tabId].lastExportedContentSha256 = sha256(child.content);

        results.push({
          ...rowBase,
          status: "refreshed-local",
          detail: "Remote changed while local was unchanged."
        });
      } else {
        results.push({
          ...rowBase,
          status: "would-refresh-local",
          detail: "Remote changed while local was unchanged."
        });
      }
      continue;
    }

    if (localChanged && remoteChanged) {
      results.push({
        ...rowBase,
        status: "conflict",
        detail: "Both local file and remote state changed since last manifest baseline."
      });
      continue;
    }

    const updatedPayload = buildUpdatedPayload(child.payload, localContent);

    if (!apply) {
      results.push({
        ...rowBase,
        status: child.openTrunk ? "would-append-state" : "would-open-proposal"
      });
      continue;
    }

    try {
      if (child.openTrunk) {
        const state = await appendState({
          apiBaseUrl,
          sessionId,
          organismId: child.organismId,
          payload: updatedPayload
        });
        mutableManifest.entries[tabId].lastKnownStateId = ensureString(
          state.id,
          `Append state response missing state id for "${tabId}".`
        );
        mutableManifest.entries[tabId].lastKnownSequenceNumber = ensureNumber(
          state.sequenceNumber,
          `Append state response missing sequence number for "${tabId}".`
        );
        mutableManifest.entries[tabId].lastExportedContentSha256 = localContentHash;

        results.push({
          ...rowBase,
          status: "appended-state",
          stateId: state.id
        });
      } else {
        const proposal = await openProposal({
          apiBaseUrl,
          sessionId,
          organismId: child.organismId,
          organismName: child.organismName,
          payload: updatedPayload
        });
        mutableManifest.entries[tabId].lastExportedContentSha256 = localContentHash;

        results.push({
          ...rowBase,
          status: "opened-proposal",
          proposalId: proposal.id
        });
      }
    } catch (error) {
      results.push({
        ...rowBase,
        status: "error",
        detail: error.message
      });
    }
  }

  if (apply) {
    alignManifestMetadata(mutableManifest, {
      apiBaseUrl,
      targetMode: targetResolution.targetMode,
      targetOrganismId: targetResolution.targetOrganismId
    });
    await writeManifest(rootPath, mutableManifest);
  }

  const summary = {
    unchanged: 0,
    "would-refresh-local": 0,
    "would-append-state": 0,
    "would-open-proposal": 0,
    "refreshed-local": 0,
    "appended-state": 0,
    "opened-proposal": 0,
    conflict: 0,
    error: 0
  };

  for (const row of results) {
    if (Object.prototype.hasOwnProperty.call(summary, row.status)) {
      summary[row.status] += 1;
    }
  }

  return {
    operation: "sync",
    apply,
    rootPath,
    apiBaseUrl,
    targetMode: targetResolution.targetMode,
    targetOrganismId: targetResolution.targetOrganismId,
    manifestPath: resolveManifestPath(rootPath),
    results,
    summary
  };
}
