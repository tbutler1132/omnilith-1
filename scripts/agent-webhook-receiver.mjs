#!/usr/bin/env node

/**
 * Agent webhook receiver reference implementation.
 *
 * Receives issue dispatch events from GitHub Actions, validates payload shape,
 * stores each event on disk for reliable local processing, and optionally
 * triggers a command hook for custom automation.
 */

import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const PORT = Number.parseInt(process.env.AGENT_RECEIVER_PORT ?? "8789", 10);
const ROUTE_PATH = process.env.AGENT_RECEIVER_PATH ?? "/agent-dispatch";
const OUT_DIR = process.env.AGENT_RECEIVER_OUT_DIR ?? "tmp/agent-dispatch-events";
const MAX_BYTES = Number.parseInt(process.env.AGENT_RECEIVER_MAX_BYTES ?? "1048576", 10);
const EXPECTED_TOKEN = process.env.AGENT_RECEIVER_TOKEN;
const HOOK_COMMAND = process.env.AGENT_RECEIVER_HOOK_COMMAND;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BYTES) {
        reject(new Error("payload too large"));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validatePayload(payload) {
  if (!isPlainObject(payload)) {
    throw new Error("payload must be a JSON object");
  }

  if (payload.event !== "agent_issue_ready") {
    throw new Error('payload.event must be "agent_issue_ready"');
  }

  if (typeof payload.repository !== "string" || !payload.repository.includes("/")) {
    throw new Error("payload.repository must be owner/repo string");
  }

  if (!isPlainObject(payload.issue)) {
    throw new Error("payload.issue must be an object");
  }

  if (typeof payload.issue.number !== "number") {
    throw new Error("payload.issue.number must be a number");
  }

  if (typeof payload.issue.title !== "string" || payload.issue.title.trim().length === 0) {
    throw new Error("payload.issue.title must be a non-empty string");
  }
}

function tokenFromHeader(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

async function persistPayload(payload) {
  await mkdir(OUT_DIR, { recursive: true });
  const fileName = `${Date.now()}-issue-${payload.issue.number}.json`;
  const filePath = path.join(OUT_DIR, fileName);
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

async function runHookCommand(filePath) {
  if (!HOOK_COMMAND) {
    return;
  }

  const child = spawn("sh", ["-lc", HOOK_COMMAND], {
    env: {
      ...process.env,
      AGENT_EVENT_FILE: filePath
    },
    stdio: "inherit"
  });

  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`hook command exited with code ${code}`));
    });
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method !== "POST" || request.url !== ROUTE_PATH) {
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  if (EXPECTED_TOKEN) {
    const providedToken = tokenFromHeader(request.headers.authorization);
    if (providedToken !== EXPECTED_TOKEN) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }
  }

  let rawBody;
  try {
    rawBody = await readRequestBody(request);
  } catch (error) {
    sendJson(response, 413, { error: error.message });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
    validatePayload(payload);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  try {
    const eventFile = await persistPayload(payload);
    await runHookCommand(eventFile);

    sendJson(response, 202, {
      status: "queued",
      issueNumber: payload.issue.number,
      eventFile
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  const tokenMode = EXPECTED_TOKEN ? "enabled" : "disabled";
  const hookMode = HOOK_COMMAND ? "enabled" : "disabled";

  console.log(`agent receiver listening on http://localhost:${PORT}${ROUTE_PATH}`);
  console.log(`health endpoint: http://localhost:${PORT}/health`);
  console.log(`token auth: ${tokenMode}`);
  console.log(`hook command: ${hookMode}`);
  console.log(`out dir: ${OUT_DIR}`);
});
