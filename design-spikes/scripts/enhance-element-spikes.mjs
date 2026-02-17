import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('design-spikes/current-state/elements');
const GROUPS = ['panels', 'widgets', 'cues', 'shells'];

const CSS_BLOCK = String.raw`

/* spike-interaction-controls */
.spike-controls {
  border-color: rgba(124, 108, 240, 0.45);
  background: rgba(15, 15, 26, 0.9);
}

.spike-controls-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.spike-control-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--hud-border);
  background: rgba(124, 108, 240, 0.06);
}

.spike-control-label {
  font-family: var(--hud-mono);
  font-size: 10px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--hud-text);
  margin-right: 4px;
}

.spike-control-btn {
  border: 1px solid var(--hud-border);
  background: rgba(12, 12, 20, 0.9);
  color: var(--hud-text-dim, #b9bbca);
  font-family: var(--hud-mono);
  font-size: 10px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
}

.spike-control-btn:hover {
  color: var(--hud-text-bright);
  border-color: var(--hud-border-hover);
}

.spike-control-btn.is-active {
  color: var(--hud-text-bright);
  border-color: var(--hud-border-hover);
  background: rgba(124, 108, 240, 0.2);
}

.spike-stage {
  position: relative;
}

.spike-render-root {
  transition: opacity 140ms ease;
}

.spike-state-overlay {
  display: none;
  position: absolute;
  inset: 14px;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.spike-state-card {
  min-width: 220px;
  max-width: 380px;
  border-radius: 12px;
  border: 1px solid var(--hud-border);
  background: rgba(8, 9, 15, 0.92);
  padding: 12px;
  text-align: center;
}

.spike-state-card strong {
  display: block;
  font-size: 12px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--hud-text-bright);
}

.spike-state-card p {
  margin: 6px 0 0;
  color: var(--text-dim);
  font-size: 12px;
}

.spike-spinner {
  width: 22px;
  height: 22px;
  margin: 0 auto 8px;
  border-radius: 999px;
  border: 2px solid rgba(124, 108, 240, 0.24);
  border-top-color: rgba(180, 170, 255, 0.95);
  animation: spike-spin 0.85s linear infinite;
}

@keyframes spike-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spike-stage[data-spike-state="loading"] .spike-render-root {
  opacity: 0.38;
}

.spike-stage[data-spike-state="loading"] .spike-state-overlay--loading,
.spike-stage[data-spike-state="empty"] .spike-state-overlay--empty,
.spike-stage[data-spike-state="error"] .spike-state-overlay--error {
  display: flex;
}

.spike-stage[data-spike-state="empty"] .spike-render-root,
.spike-stage[data-spike-state="error"] .spike-render-root {
  opacity: 0;
}

body[data-spike-mode="visual"] {
  padding: 0;
  background: #05050a;
}

body[data-spike-mode="visual"] .spike-shell {
  max-width: none;
  gap: 0;
}

body[data-spike-mode="visual"] .spike-card:not(.spike-controls):not(.spike-preview-card),
body[data-spike-mode="visual"] .spike-back {
  display: none;
}

body[data-spike-mode="visual"] .spike-preview-card {
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
}

body[data-spike-mode="visual"] .spike-preview-card .spike-kicker {
  display: none;
}

body[data-spike-mode="visual"] .spike-stage {
  min-height: 100vh;
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
}

body[data-spike-mode="visual"] .spike-controls {
  position: fixed;
  top: 10px;
  left: 10px;
  right: auto;
  z-index: 40;
  max-width: calc(100vw - 20px);
  backdrop-filter: blur(7px);
}

@media (max-width: 740px) {
  .spike-controls-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .spike-control-group {
    width: 100%;
    flex-wrap: wrap;
  }
}
`;

const CONTROLS_SECTION = String.raw`
      <section class="spike-card spike-controls">
        <div class="spike-controls-row">
          <div class="spike-control-group" role="group" aria-label="View mode">
            <span class="spike-control-label">View</span>
            <button type="button" class="spike-control-btn is-active" data-spike-mode-select="annotated">Annotated</button>
            <button type="button" class="spike-control-btn" data-spike-mode-select="visual">Visual only</button>
          </div>
          <div class="spike-control-group" role="group" aria-label="State preview">
            <span class="spike-control-label">State</span>
            <button type="button" class="spike-control-btn is-active" data-spike-state-select="default">Default</button>
            <button type="button" class="spike-control-btn" data-spike-state-select="loading">Loading</button>
            <button type="button" class="spike-control-btn" data-spike-state-select="empty">Empty</button>
            <button type="button" class="spike-control-btn" data-spike-state-select="error">Error</button>
          </div>
        </div>
      </section>

`;

const OVERLAY_BLOCK = String.raw`
          <div class="spike-render-root">__INNER__</div>
          <div class="spike-state-overlay spike-state-overlay--loading" aria-live="polite">
            <div class="spike-state-card">
              <div class="spike-spinner" aria-hidden="true"></div>
              <strong>Loading State</strong>
              <p>Panel data is synchronizing with the current visor context.</p>
            </div>
          </div>
          <div class="spike-state-overlay spike-state-overlay--empty" aria-live="polite">
            <div class="spike-state-card">
              <strong>Empty State</strong>
              <p>No renderable content is currently available for this surface.</p>
            </div>
          </div>
          <div class="spike-state-overlay spike-state-overlay--error" aria-live="polite">
            <div class="spike-state-card">
              <strong>Error State</strong>
              <p>This surface cannot render due to a data or orchestration mismatch.</p>
            </div>
          </div>
`;

const SCRIPT_BLOCK = String.raw`
<script>
(() => {
  const body = document.body;
  const stage = document.querySelector('.spike-stage');
  if (!stage) {
    return;
  }

  const modeButtons = Array.from(document.querySelectorAll('[data-spike-mode-select]'));
  const stateButtons = Array.from(document.querySelectorAll('[data-spike-state-select]'));

  const markActive = (buttons, activeValue, key) => {
    buttons.forEach((button) => {
      const isActive = button.dataset[key] === activeValue;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  const setMode = (mode) => {
    body.dataset.spikeMode = mode;
    markActive(modeButtons, mode, 'spikeModeSelect');
  };

  const setState = (state) => {
    stage.dataset.spikeState = state;
    markActive(stateButtons, state, 'spikeStateSelect');
  };

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.spikeModeSelect;
      if (value) {
        setMode(value);
      }
    });
  });

  stateButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.spikeStateSelect;
      if (value) {
        setState(value);
      }
    });
  });

  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get('mode') === 'visual' ? 'visual' : 'annotated';
  const stateParam = params.get('state');
  const allowedStates = new Set(['default', 'loading', 'empty', 'error']);
  const initialState = allowedStates.has(stateParam || '') ? stateParam : 'default';

  setMode(modeParam);
  setState(initialState);
})();
</script>
`;

function findMatchingDivClose(html, openIndex) {
  const tagPattern = /<\/?div\b[^>]*>/g;
  tagPattern.lastIndex = openIndex;
  let depth = 0;

  for (const match of html.matchAll(tagPattern)) {
    const token = match[0];
    const index = match.index ?? -1;
    if (index < openIndex) {
      continue;
    }

    if (token.startsWith('</div')) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
      continue;
    }

    depth += 1;
  }

  return -1;
}

function ensureCss(html) {
  if (html.includes('spike-interaction-controls')) {
    return html;
  }
  return html.replace('</style>', `${CSS_BLOCK}\n</style>`);
}

function ensureControlsSection(html) {
  if (html.includes('data-spike-mode-select')) {
    return html;
  }

  let next = html.replace(
    /<section class="spike-card">\s*<h2 class="spike-kicker" style="margin-bottom:8px">Rendered Static Preview<\/h2>/,
    '<section class="spike-card spike-preview-card">\n        <h2 class="spike-kicker" style="margin-bottom:8px">Rendered Static Preview</h2>',
  );

  next = next.replace(
    /\n\s*<section class="spike-card spike-preview-card">/,
    `\n${CONTROLS_SECTION}      <section class="spike-card spike-preview-card">`,
  );

  return next;
}

function ensureStageStateAttr(html) {
  if (html.includes('data-spike-state="default"')) {
    return html;
  }
  return html.replace(/<div class="spike-stage([^"]*)">/, '<div class="spike-stage$1" data-spike-state="default">');
}

function ensureOverlays(html) {
  if (html.includes('<div class=\"spike-state-overlay spike-state-overlay--loading\"')) {
    return html;
  }

  const stageStart = html.indexOf('<div class="spike-stage');
  if (stageStart === -1) {
    return html;
  }

  const stageOpenEnd = html.indexOf('>', stageStart);
  if (stageOpenEnd === -1) {
    return html;
  }

  const stageCloseStart = findMatchingDivClose(html, stageStart);
  if (stageCloseStart === -1) {
    return html;
  }

  const inner = html.slice(stageOpenEnd + 1, stageCloseStart);
  const normalizedInner = inner.replace(/^\n?/, '\n').replace(/\s*$/, '\n');
  const wrapped = OVERLAY_BLOCK.replace('__INNER__', normalizedInner);

  return `${html.slice(0, stageOpenEnd + 1)}${wrapped}${html.slice(stageCloseStart)}`;
}

function ensureScript(html) {
  if (html.includes('window.location.search')) {
    return html;
  }
  return html.replace('</body>', `${SCRIPT_BLOCK}\n  </body>`);
}

async function run() {
  const htmlFiles = [];
  for (const group of GROUPS) {
    const groupDir = path.join(ROOT, group);
    const names = await fs.readdir(groupDir);
    for (const name of names) {
      if (name.endsWith('.html')) {
        htmlFiles.push(path.join(groupDir, name));
      }
    }
  }

  for (const filePath of htmlFiles) {
    const original = await fs.readFile(filePath, 'utf8');
    let updated = original;
    updated = ensureCss(updated);
    updated = ensureControlsSection(updated);
    updated = ensureStageStateAttr(updated);
    updated = ensureOverlays(updated);
    updated = ensureScript(updated);

    if (updated !== original) {
      await fs.writeFile(filePath, updated, 'utf8');
    }
  }

  console.log(`Enhanced ${htmlFiles.length} element pages.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
