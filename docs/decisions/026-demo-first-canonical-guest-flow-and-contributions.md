# 026 — Demo-First Canonical Guest Flow, Parallel Auth Profiles, and Organism Contributions

## Context

A focused Phase 1 V1 was proposed with an explicit constraint: ship a public demo quickly without slowing on full authenticated development.

The practical requirements were:

- hide login/auth UX for the demo
- keep auth-capable architecture clean so full flow can be restored without rewrites
- keep interest capture available for write-gated actions
- support Hero's Journey presentation in V1 without building a full generic scene system
- support playable media and realistic demo content storage
- support tutorial cues that can open playback in the main panel
- keep separate development convenience for demo and auth (ports, databases, seed profiles)
- demonstrate contribution credit clearly on each organism

## Decision

Adopt a demo-first architecture where guest flow is canonical for V1 encounter, while auth remains a switchable path and all demo-specific behavior is contained in explicit runtime/config boundaries.

### 1) Guest encounter is the default V1 path

- Login UI is hidden in demo mode.
- Public read paths remain available for organism encounter.
- Write-oriented actions are guest-gated through explicit prompts.

### 2) Auth remains available behind runtime flags

- Auth behavior is not removed, only hidden/deactivated by configuration.
- Guest gating strategy is runtime-selectable (`interest` vs `login`) so migration back to full auth prompting is panel-stable.

### 3) Interest capture becomes the guest write gate

- Guest attempts on write-oriented panels route to interest capture.
- Interest submissions are persisted and can forward to external list intake (Substack integration path).

### 4) Hero's Journey uses a bespoke content type for V1

- A dedicated `hero-journey-scene` content type and renderer are introduced for V1 narrative clarity.
- This is intentionally a fast, bounded implementation rather than a generalized scene framework.

### 5) Demo media/file access is enabled through explicit public file routes

- Read-only public file serving is added for demo playback paths.
- Storage wiring supports realistic preview/play behavior without collapsing boundary semantics.

### 6) Tutorial cues are positioning-first with action handoff

- Cue behavior prioritizes reliable anchoring/placement.
- Cue `play` intent dismisses the cue and opens playback in the main panel flow.

### 7) Development runs in two parallel profiles

- Distinct dev scripts/ports for demo and auth profiles.
- Distinct databases and reset/seed workflows for each profile.
- Seed strategy is split:
  - focused `v1-demo` seed for curated public experience
  - fuller `full-dev` seed for ongoing authenticated development

### 8) Organism contributions are a first-class read model

- Add query-level organism contribution aggregation (state authorship, proposals, resolver activity, events).
- Expose authenticated and public read endpoints for organism contributions.
- Add a dedicated Contributions panel in the universal visor panel set.
- Use deterministic privacy-safe contributor aliases in rendering, with short IDs retained as secondary debug labels.

## Rationale

- Keeps shipping velocity high without creating a throwaway branch.
- Preserves a clean return path to auth-first interactions by configuration, not rewrites.
- Maintains architecture discipline: kernel concerns stay stable; capability enters via query/read models, routes, renderers, and composition.
- Supports demo realism (media playback, seeded narrative flow) without prematurely hardening speculative generic systems.
- Makes contribution credit explicit on organisms, reinforcing stewardship and collaborative tending.

## Consequences

### Positive

- One branch can serve both demo-facing and auth-facing development.
- Public encounter quality improves while regulatory/write boundaries remain clear.
- Contribution credit becomes legible per organism for both demo and future production flows.

### Tradeoff

- Runtime-flag matrix adds configuration complexity that must stay documented.
- Bespoke V1 renderer/content-type may require later generalization or replacement.
- Public-safe contributor rendering uses aliases rather than human profile names until profile display modeling is added.

## Status

Accepted and implemented.
