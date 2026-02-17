# Design Spikes Workspace

This directory is for presentation and interaction design spikes before React implementation.

Start from `design-spikes/index.html` for the visual hub and quick links to all spikes.

The goal is to separate concerns clearly:

1. `packages/kernel` defines infrastructure behavior.
2. `packages/api` exposes read/write operations.
3. `design-spikes` defines rendering, interaction flow, and panel states.
4. `packages/web` implements approved spikes in React.

## Directory Layout

- `design-spikes/panel-template.html` — reusable panel spike harness (slot framing + shared states).
- `design-spikes/panels/` — panel-specific spikes (`threshold-v1.html`, etc.).
- `design-spikes/visor/` — Adaptive Visor topology spikes.
- `design-spikes/contracts/` — implementation contracts and acceptance criteria.
- `design-spikes/explainers/` — standalone explainer pages.
- `design-spikes/current-state/` — implementation snapshots of current adaptive behavior.
  - includes rendered element spikes with per-page `Visual only` and `Default/Loading/Empty/Error` state controls
- `design-spikes/scripts/enhance-element-spikes.mjs` — utility to apply/refresh controls across current-state element pages.
- `design-spikes/implementation-status.json` — official spike-to-React implementation status tracker (`spike-only`, `approved`, `implemented`, `parity-verified`).
- `design-spikes/SPIKE-BRIEF-TEMPLATE.md` — input brief for new spikes.

## Workflow

1. Start from `panel-template.html` or a prior spike.
2. Confirm contract source for adaptive visor behavior:
   - `packages/web/src/hud/contracts/adaptive-visor-behavior-contract.ts`
3. Define the full state surface in the spike:
   - `default`
   - `loading`
   - `empty`
   - `error`
   - `auth-required`
4. Design end-to-end interactions in HTML/CSS/JS first.
5. Write a contract in `contracts/` for that spike version.
6. Review and approve visual + interaction behavior.
7. Translate to React with contract mapping notes.
8. Validate in-app behavior with real data and edge cases.
9. Ensure `packages/web/src/hud/contracts/adaptive-visor-behavior-contract.test.ts` passes.

## Definition Of Ready (Before React)

A spike is ready to implement when:

- Visual hierarchy is approved.
- All required states are explicitly designed.
- Primary and secondary actions are final.
- Mobile and desktop behavior are defined.
- Copy tone is approved.
- Accessibility notes are captured (focus order and keyboard interactions).
- React mapping targets are listed in the contract.

## Naming Convention

- Spikes: `<feature>-v<version>.html`
- Contracts: `<feature>-contract-v<version>.md`

Examples:

- `panels/threshold-v1.html`
- `contracts/threshold-contract-v1.md`
- `visor/adaptive-visor-layout-v1.html`
- `contracts/adaptive-visor-contract-v1.md`

## Recommended Review Checklist

- Is the panel understandable in under 20 seconds?
- Is one clear primary action present?
- Do empty/error/auth states guide next steps clearly?
- Is the design consistent with Omnilith HUD tokens and tone?
- Are long and unusual data cases accounted for?
- Is keyboard interaction predictable?

## Translation Guidance

During translation to React, keep implementation as a direct mapping from spike contract:

- Do not redesign while implementing.
- Match spacing/typography/action order first.
- Add runtime behavior after static parity is reached.
- Keep a short "diff note" in PR description if implementation intentionally diverges.
