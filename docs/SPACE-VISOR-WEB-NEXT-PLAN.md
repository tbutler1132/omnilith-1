# Omnilith — Space/Visor Web-Next Plan

Status: Active working plan  
Updated: February 23, 2026  
Audience: Founders, maintainers, agents  
Canonicality: Implementation plan for rendering rebuild (defers to Foundation/Organism Model/Decision Log)

## Intent

Rebuild rendering in a parallel package with a tighter shape, while preserving current behavior until cutover.

This plan keeps the canonical Space/Visor divide and shifts the Visor to a clear two-mode model:

1. Closed Visor: persistent HUD.
2. Open Visor: app surface (phone metaphor) with URL-addressable apps.

## Direction Summary

What stays:

- Canonical Space remains the primary experiential layer.
- Space and Visor remain distinct concerns.
- Map remains central to navigation and orientation.

What changes:

- Top-level navigation and altitude controls move into the closed Visor HUD.
- Adaptive panel orchestration is simplified into explicit Visor app mode switching.
- Current panels become self-contained Visor apps.
- Visor apps are addressable by URL so links can open specific app states.

## Build Strategy

Use a parallel package strategy, then cut over.

- Keep `packages/web` running as the stable baseline.
- Build new rendering in `packages/web-next` (suggested package name: `@omnilith/web-next`).
- Share API contracts and rendering conventions; avoid duplicate backend behavior.
- Migrate in slices that are end-to-end demoable.
- Switch defaults only after acceptance checks pass.

## Slice Plan

### Slice 0 — Package Bootstrap (`web-next`)

Outcome: `web-next` runs against current API and world map with minimal shell.

Scope:

- Create `packages/web-next` with Vite + React + TypeScript shape matching workspace conventions.
- Wire root scripts for local development and build/test/lint targeting `@omnilith/web-next`.
- Keep `@omnilith/web` untouched and runnable in parallel.
- Stand up minimal platform shell (`Space`, placeholder closed Visor HUD).

Acceptance:

- `pnpm --filter @omnilith/web-next dev` starts cleanly.
- `pnpm --filter @omnilith/web-next build && pnpm --filter @omnilith/web-next lint && pnpm --filter @omnilith/web-next test` pass.

### Slice 1 — Map First (Behavioral Parity + Targeted Tweaks)

Outcome: map feels right in `web-next` before Visor complexity increases.

Scope:

- Reproduce current map interaction path in `web-next`.
- Apply targeted map tweaks only (no open Visor app work yet).
- Keep movement semantics explicit and consistent with Space/Visor separation.
- Keep digital interpretation as Visor concern (aligned with decision 031/032 intent).

Acceptance:

- Foundational map navigation/tending flow is demoable end-to-end.
- No regressions in load/empty/error handling for map data.

### Slice 2 — Closed Visor HUD

Outcome: closed Visor becomes the persistent control surface.

Scope:

- Closed HUD includes:
  - top-level navigation
  - altitude controls
  - compass
  - map legend
  - bottom app dock (launch points)
- Move controls out of Space-specific chrome into Visor HUD.
- Preserve Space legibility while HUD is always available.

Acceptance:

- Closed HUD is always present and usable during Space navigation.
- Dock can open targeted app context (even if app body is placeholder).

### Slice 3 — Open Visor Shell + URL App Routing

Outcome: open Visor behaves like a dedicated app surface.

Scope:

- Implement open/closed Visor state machine (simple, deterministic).
- Add app host container for open mode.
- Define URL contract for deep linking (example: `?visor=open&app=map&organism=<id>`).
- Back/forward navigation preserves Visor app context.

Acceptance:

- Direct URL load opens the intended app and context.
- Closing Visor returns cleanly to closed HUD state without losing Space continuity.

### Slice 4 — App Isolation + Migration

Outcome: existing panel capabilities land as isolated Visor apps.

Scope:

- Create app boundaries/folders with one concept per file.
- Migrate current panel capabilities into apps incrementally.
- Prioritize apps that unblock Phase 1 read/write path first.

Proposed app migration order:

1. `map` app
2. `organism` app (universal layer read path)
3. `proposals` app
4. `my-organisms` / `profile` tending views
5. remaining write flows (threshold/propose helpers)

Acceptance:

- Each migrated app can be loaded from dock and URL.
- App code is isolated enough to iterate independently.

### Slice 5 — Cutover

Outcome: `web-next` replaces `web` as the default rendering package.

Scope:

- Rename/swap package roles after acceptance criteria are met.
- Update root scripts to point canonical dev flow at new package.
- Retire legacy package once confidence is high.

Acceptance:

- Canonical local flow uses rebuilt package by default.
- Legacy package either archived or removed with clear handoff notes.

## API Plan

Default assumption: no immediate API changes for slices 0-2.

Potential additive API work in later slices (only if needed by app-mode UX):

- App boot payload optimization endpoints for faster open-Visor load.
- Query shape additions for app-specific read paths.
- URL-linked context helpers where current endpoints are too chatty.

Rule: keep API changes additive and usable by both `web` and `web-next` until cutover.

## Seed Plan

Two-phase seed strategy: bootstrap minimal, then rebuild intentionally.

### Phase A — New Initial Seed Profile (for `web-next`)

Add a focused profile in `packages/api/src/seed-dev.ts` (suggested key: `web-next-baseline`):

- world map + pointer (existing `seedWorldMap`)
- one founder user/session path for tending
- small, legible organism set for map + universal layer testing
- at least one regulated boundary and one open-trunk boundary

Goal: deterministic, fast reset loop for map/HUD/app shell development.

### Phase B — Build Seed Back Up Slice-by-Slice

After map/HUD/open-Visor behavior stabilizes:

- add organisms only when a specific app needs them
- keep blueprint-driven payloads for editable content structure
- preserve readability of seed intent (small helpers, explicit composition)
- keep existing `v1-demo` profile intact until cutover decision

Suggested scripts to add during implementation:

- `dev:web-next` (API + `web-next`)
- `db:reset:web-next` (resets using `web-next-baseline`)

## Decision Alignment

This plan aligns with the core direction of:

- `docs/decisions/031-canonical-natural-space-with-optional-digital-visor-map-overlay.md`
- `docs/decisions/032-digital-map-staged-delivery-panel-first-overlay-later.md`
- `docs/decisions/030-visor-hud-extension-host-default-first-delivery.md`

Expected update: once Slice 2/3 starts, add a new decision record clarifying that adaptive panel orchestration is being simplified into explicit open/closed Visor app modes for the current phase.

## Working Rules During Rebuild

- No kernel changes for rendering concerns.
- Keep controlled vocabulary in code/docs.
- Prefer additive API changes over breaking shape changes.
- Keep slices small and demoable.
- Run `pnpm run check` after meaningful integration milestones.

## Ready-Now Checklist

- [ ] Create `packages/web-next` skeleton.
- [ ] Wire root scripts for `web-next` dev/build/test/lint.
- [ ] Add `web-next-baseline` seed profile router path.
- [ ] Implement Slice 1 map baseline in `web-next`.
- [ ] Implement closed Visor HUD shell with dock.
- [ ] Implement open Visor app host + URL contract.
- [ ] Migrate first app (`map`) and validate deep-link behavior.
