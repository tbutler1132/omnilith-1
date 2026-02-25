#!/usr/bin/env node

/**
 * Cadence sync GUI server.
 *
 * Serves a local browser interface for cadence export/sync so filesystem-first
 * tending can stay visual while using the same governance-aware engine as CLI.
 */

import http from "node:http";
import process from "node:process";
import { runCadenceExport, runCadenceSync } from "./cadence-sync-lib.mjs";

const DEFAULT_PORT = Number(process.env.CADENCE_GUI_PORT ?? "8791");
const DEFAULT_PATH = process.env.CADENCE_PATH ?? "/Users/timbutler/Life";
const DEFAULT_API = process.env.CADENCE_API ?? "http://localhost:3000";
const DEFAULT_EMAIL = process.env.CADENCE_EMAIL ?? "dev@omnilith.local";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(payload)}\n`);
}

function sendHtml(response, html) {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
}

async function readJsonRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw.length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    throw new Error("Invalid JSON request body.");
  }
}

function toEngineInput(body) {
  return {
    path: typeof body.path === "string" && body.path.trim().length > 0 ? body.path.trim() : DEFAULT_PATH,
    apiBaseUrl: typeof body.apiBaseUrl === "string" && body.apiBaseUrl.trim().length > 0 ? body.apiBaseUrl.trim() : DEFAULT_API,
    targetMode: body.targetMode === "organism-id" ? "organism-id" : "personal",
    targetOrganismId: typeof body.targetOrganismId === "string" && body.targetOrganismId.trim().length > 0 ? body.targetOrganismId.trim() : undefined,
    sessionId: typeof body.sessionId === "string" && body.sessionId.trim().length > 0 ? body.sessionId.trim() : undefined,
    email: typeof body.email === "string" && body.email.trim().length > 0 ? body.email.trim() : undefined,
    password: typeof body.password === "string" && body.password.length > 0 ? body.password : undefined
  };
}

function pageHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cadence Sync GUI</title>
    <style>
      :root {
        --bg: #f7f6f2;
        --panel: #ffffff;
        --ink: #2f2a24;
        --muted: #70665c;
        --accent: #2d6a4f;
        --accent-soft: #d8f3dc;
        --warn: #9c2f2f;
        --border: #e6e0d8;
      }
      body {
        margin: 0;
        background: radial-gradient(circle at top right, #ece8ff 0%, transparent 38%), var(--bg);
        color: var(--ink);
        font: 15px/1.4 "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
      }
      .shell {
        max-width: 1040px;
        margin: 24px auto;
        padding: 0 16px 24px;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 30px;
      }
      .sub {
        margin: 0 0 18px;
        color: var(--muted);
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 14px;
        box-shadow: 0 8px 24px rgba(34, 34, 34, 0.05);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      @media (max-width: 860px) {
        .grid { grid-template-columns: 1fr; }
      }
      label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      input, select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 8px 10px;
        font: inherit;
        background: #fff;
      }
      .actions {
        margin-top: 12px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      button {
        border: 1px solid #1f5b43;
        background: var(--accent);
        color: #fff;
        border-radius: 10px;
        padding: 8px 12px;
        font: inherit;
        cursor: pointer;
      }
      button.secondary {
        background: #fff;
        border-color: var(--border);
        color: var(--ink);
      }
      .status {
        margin-top: 12px;
        padding: 10px;
        border-radius: 10px;
        background: var(--accent-soft);
      }
      .status.error {
        background: #ffe3e3;
        color: var(--warn);
      }
      .result {
        margin-top: 16px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      th, td {
        border-bottom: 1px solid var(--border);
        text-align: left;
        padding: 7px;
        vertical-align: top;
      }
      th {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--muted);
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13px;
      }
      .small {
        color: var(--muted);
        font-size: 13px;
      }
      code {
        background: #f4f2ee;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1px 6px;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <h1>Cadence Sync</h1>
      <p class="sub">Filesystem-first cadence tending with export, dry-run, and apply.</p>

      <div class="card">
        <div class="grid">
          <div>
            <label for="path">Life Path</label>
            <input id="path" value="${DEFAULT_PATH.replace(/"/g, "&quot;")}" />
          </div>
          <div>
            <label for="apiBaseUrl">API Base URL</label>
            <input id="apiBaseUrl" value="${DEFAULT_API.replace(/"/g, "&quot;")}" />
          </div>
          <div>
            <label for="targetMode">Target Mode</label>
            <select id="targetMode">
              <option value="personal">personal</option>
              <option value="organism-id">organism-id</option>
            </select>
          </div>
          <div>
            <label for="targetOrganismId">Target Organism ID (optional)</label>
            <input id="targetOrganismId" placeholder="required if target mode is organism-id" />
          </div>
          <div>
            <label for="sessionId">Session ID (optional)</label>
            <input id="sessionId" placeholder="Bearer token without prefix" />
          </div>
          <div>
            <label for="email">Email (login fallback)</label>
            <input id="email" value="${DEFAULT_EMAIL.replace(/"/g, "&quot;")}" />
          </div>
          <div>
            <label for="password">Password (login fallback)</label>
            <input id="password" type="password" placeholder="only used if no session token" />
          </div>
        </div>

        <div class="actions">
          <button id="exportBtn">Export</button>
          <button id="dryRunBtn" class="secondary">Dry Run</button>
          <button id="applyBtn">Apply</button>
        </div>

        <div id="status" class="status small">Ready.</div>
        <div id="result" class="result"></div>
      </div>
    </div>

    <script>
      const statusNode = document.getElementById("status");
      const resultNode = document.getElementById("result");
      const exportBtn = document.getElementById("exportBtn");
      const dryRunBtn = document.getElementById("dryRunBtn");
      const applyBtn = document.getElementById("applyBtn");

      function readInput() {
        return {
          path: document.getElementById("path").value,
          apiBaseUrl: document.getElementById("apiBaseUrl").value,
          targetMode: document.getElementById("targetMode").value,
          targetOrganismId: document.getElementById("targetOrganismId").value,
          sessionId: document.getElementById("sessionId").value,
          email: document.getElementById("email").value,
          password: document.getElementById("password").value
        };
      }

      function setBusy(busy) {
        exportBtn.disabled = busy;
        dryRunBtn.disabled = busy;
        applyBtn.disabled = busy;
      }

      function setStatus(text, isError = false) {
        statusNode.textContent = text;
        statusNode.className = isError ? "status error small" : "status small";
      }

      function renderOutcome(outcome) {
        const results = Array.isArray(outcome.results) ? outcome.results : [];
        const summary = outcome.summary ? JSON.stringify(outcome.summary, null, 2) : "";
        const rows = results.map((row) => {
          const detail = [row.stateId ? "state=" + row.stateId : "", row.proposalId ? "proposal=" + row.proposalId : "", row.detail || ""].filter(Boolean).join("; ");
          return "<tr><td class='mono'>" + row.tabId + "</td><td class='mono'>" + row.status + "</td><td class='small'>" + (detail || "&nbsp;") + "</td></tr>";
        }).join("");

        resultNode.innerHTML =
          "<p class='small'>Operation: <code>" + outcome.operation + "</code> &middot; Target: <code>" + outcome.targetOrganismId + "</code></p>" +
          "<table><thead><tr><th>Tab</th><th>Status</th><th>Detail</th></tr></thead><tbody>" + rows + "</tbody></table>" +
          (summary ? "<p class='small'>Summary</p><pre class='mono'>" + summary + "</pre>" : "");
      }

      async function callApi(endpoint, body) {
        setBusy(true);
        setStatus("Working...");
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body)
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error || "Request failed");
          }
          renderOutcome(payload);
          setStatus("Done.");
        } catch (error) {
          setStatus(error.message, true);
        } finally {
          setBusy(false);
        }
      }

      exportBtn.addEventListener("click", () => callApi("/api/export", readInput()));
      dryRunBtn.addEventListener("click", () => callApi("/api/sync", { ...readInput(), apply: false }));
      applyBtn.addEventListener("click", () => callApi("/api/sync", { ...readInput(), apply: true }));
    </script>
  </body>
</html>`;
}

async function handleExport(request, response) {
  try {
    const body = await readJsonRequestBody(request);
    const input = toEngineInput(body);
    const outcome = await runCadenceExport(input);
    sendJson(response, 200, outcome);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}

async function handleSync(request, response) {
  try {
    const body = await readJsonRequestBody(request);
    const input = toEngineInput(body);
    input.apply = body.apply === true;
    const outcome = await runCadenceSync(input);
    const statusCode = outcome.summary?.conflict > 0 || outcome.summary?.error > 0 ? 409 : 200;
    sendJson(response, statusCode, outcome);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && requestUrl.pathname === "/") {
    sendHtml(response, pageHtml());
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/export") {
    await handleExport(request, response);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/sync") {
    await handleSync(request, response);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(DEFAULT_PORT, "127.0.0.1", () => {
  console.log(`Cadence GUI listening on http://127.0.0.1:${DEFAULT_PORT}`);
  console.log("Open the URL above in your browser.");
});

