# Omnilith Roadmap (First Batch)

Status: Active planning document  
Updated: February 19, 2026  
Audience: Maintainers, agents  
Canonicality: Execution roadmap (defers to core docs and development system)

Use this document as the current roadmap source while issue creation is deferred.

## Summary

Execution model:

- one slice at a time per lane
- max three active slices total
- 6-week roadmap horizon
- first execution batch covers Weeks 1-3

Planned structure:

- 3 parent themes (epic-level)
- 9 execution-ready slices in first batch

## Theme Index

1. Organism Viewer v2 (demo critical)
2. Register Interest Experience Refresh
3. Composition-Reference Deep Linking

## Roadmap (6 Weeks)

### Week 1

- `core-integrity` (S): Organism Viewer spec lock and tending contract
- `experience` (M): Organism Viewer IA, tabs, near-fullscreen layout contract
- `throughput` (S): roadmap scaffolding and cycle metadata setup

### Week 2

- `core-integrity` (M): panel contract refactor for Organism Viewer + renderer-preview split
- `experience` (M): implement Organism Viewer tabs and universal overview surfaces
- `throughput` (S): viewer harness and panel contract test coverage

### Week 3

- `core-integrity` (S): composition-reference entries open target organism in visor
- `experience` (M): renderer preview panel rendering pass + near-fullscreen presentation
- `throughput` (S): register-interest experience polish + regression checks

### Week 4

- `core-integrity` (M): Hero's Journey data-flow hardening
- `experience` (M): Hero's Journey rendering and interaction completion
- `throughput` (S): demo reset and regression runbook hardening

### Week 5

- `core-integrity` (M): help cue policy v1 with context-aware selection
- `experience` (S): cue placement and visibility polish
- `throughput` (S): cue fixtures and test playbook

### Week 6

- `core-integrity` (M): demo hardening pass for cross-panel state integrity
- `experience` (S): final rendering and panel cohesion pass
- `throughput` (S): release verification checklist and closeout

## First Batch (Weeks 1-3) Slice Specs

Each slice follows the `docs/DEVELOPMENT-SYSTEM.md` contract and includes:

- intent
- lane
- size
- boundary (in/out)
- touchpoints
- risks
- acceptance checks
- verification

### Slice 1

Title: Organism Viewer spec lock and tending contract  
Lane: `core-integrity`  
Size: `S`  
Cycle: `2026-W08`  
Theme: `organism-viewer`

Intent:

- A steward can rely on one explicit Organism Viewer contract before implementation proceeds.

Boundary:

- In scope: define decision-complete viewer scope and panel responsibilities.
- Out of scope: implementing the rendering.

Touchpoints:

- `docs/DEVELOPMENT-SYSTEM.md`
- `docs/ADAPTIVE-VISOR-PANEL-FEATURE-PLAYBOOK.md`
- `packages/web/src/hud/panels/core/panel-schema.ts`
- `packages/web/src/hud/panels/core/panel-body-registry.tsx`

Risks:

- ambiguous contract causing implementation drift.

Verification:

- review against all child slices for decision completeness.

### Slice 2

Title: Organism Viewer IA, tabs, and near-fullscreen layout contract  
Lane: `experience`  
Size: `M`  
Cycle: `2026-W08`  
Theme: `organism-viewer`

Intent:

- A user can navigate a clear tab model and understand near-fullscreen behavior.

Boundary:

- In scope: define tab IA and layout contract.
- Out of scope: final visual polish.

Touchpoints:

- `packages/web/src/hud/panels/core/template-schema.ts`
- `packages/web/src/hud/panels/core/panel-layout-policy.ts`
- `packages/web/src/hud/panels/core/panel-schema.ts`

Risks:

- context-dependent layout ambiguity.

Verification:

- walk through map/interior/visor context transitions and role assignments.

### Slice 3

Title: Roadmap scaffolding and cycle metadata setup  
Lane: `throughput`  
Size: `S`  
Cycle: `2026-W08`  
Theme: `organism-viewer` (enabling)

Intent:

- Maintainers can execute one slice at a time with explicit cycle metadata.

Boundary:

- In scope: tracking conventions and lane/cycle execution mapping.
- Out of scope: product behavior changes.

Touchpoints:

- `docs/DEVELOPMENT-SYSTEM.md`
- `docs/SLICE-TRACKER.md`

Risks:

- inconsistent slice tracking without clear conventions.

Verification:

- first batch slices mapped to lane + size + cycle and ordered by week.

### Slice 4

Title: Panel contract refactor for Organism Viewer + renderer-preview split  
Lane: `core-integrity`  
Size: `M`  
Cycle: `2026-W09`  
Theme: `organism-viewer`

Intent:

- The panel system separates Organism Viewer responsibilities from renderer preview behavior.

Boundary:

- In scope: contract and role refactor for viewer vs preview.
- Out of scope: Hero's Journey-specific work.

Touchpoints:

- `packages/web/src/hud/panels/core/panel-schema.ts`
- `packages/web/src/hud/panels/core/panel-body-registry.tsx`
- `packages/web/src/hud/panels/core/panel-layout-policy.ts`
- `packages/web/src/hud/panels/core/template-schema.ts`

Risks:

- panel role regressions in adaptive policy behavior.

Verification:

- deterministic role behavior under test for supported contexts.

### Slice 5

Title: Implement Organism Viewer tabs and universal overview surfaces  
Lane: `experience`  
Size: `M`  
Cycle: `2026-W09`  
Theme: `organism-viewer`

Intent:

- A steward can inspect data and universal overview tabs from one coherent panel.

Boundary:

- In scope: tabbed viewer implementation and state coverage.
- Out of scope: full Three.js mini visualization.

Touchpoints:

- `packages/web/src/hud/panels/core/panel-body-registry.tsx`
- `packages/web/src/hud/panels/organism/OrganismPanelDeck.tsx`

Risks:

- missing loading/empty/error/auth-required coverage.

Verification:

- manual walkthrough across multiple organism states.

### Slice 6

Title: Viewer harness and panel contract test coverage  
Lane: `throughput`  
Size: `S`  
Cycle: `2026-W09`  
Theme: `organism-viewer`

Intent:

- Contributors can change viewer behavior with confidence.

Boundary:

- In scope: tests and harness coverage for panel behavior.
- Out of scope: new panel features.

Touchpoints:

- `packages/web/src/hud/panels/core/*.test.ts`
- `packages/web/src/hud/contracts/*.test.ts`

Risks:

- false confidence if context transitions are untested.

Verification:

- targeted tests plus `pnpm run check`.

### Slice 7

Title: Composition-reference entries open target organism in visor  
Lane: `core-integrity`  
Size: `S`  
Cycle: `2026-W10`  
Theme: `composition-reference`

Intent:

- A user can open referenced organisms directly from composition references.

Boundary:

- In scope: click/open behavior and safe missing-target fallback.
- Out of scope: broad renderer redesign.

Touchpoints:

- `packages/web/src/renderers/composition-reference.tsx`
- `packages/web/src/platform/PlatformContext.tsx`

Risks:

- broken references causing failed navigation.

Verification:

- valid target opens visor, invalid target fails safely.

### Slice 8

Title: Renderer preview panel rendering pass and near-fullscreen presentation  
Lane: `experience`  
Size: `M`  
Cycle: `2026-W10`  
Theme: `organism-viewer`

Intent:

- Users can focus on renderer preview in a near-fullscreen presentation.

Boundary:

- In scope: separated preview panel behavior and rendering pass.
- Out of scope: kernel and API proposal semantics.

Touchpoints:

- `packages/web/src/hud/panels/core/template-schema.ts`
- `packages/web/src/hud/panels/core/panel-layout-policy.ts`
- `packages/web/src/hud/panels/core/panel-body-registry.tsx`

Risks:

- preview mode affecting panel visibility unexpectedly.

Verification:

- thermal vs true-renderer behavior and panel interaction checks.

### Slice 9

Title: Register-interest experience polish and regression checks  
Lane: `throughput`  
Size: `S`  
Cycle: `2026-W10`  
Theme: `interest-capture`

Intent:

- Guests get a clearer register-interest experience with lower friction.

Boundary:

- In scope: content and rendering polish with regressions covered.
- Out of scope: backend schema changes and multi-step funnel redesign.

Touchpoints:

- register-interest rendering components
- interest route handling integration points

Risks:

- clarity/accessibility regressions during copy and layout updates.

Verification:

- manual guest flow + `pnpm run check`.

## Theme-to-Slice Mapping

Organism Viewer v2:

- Slice 1, Slice 2, Slice 4, Slice 5, Slice 6, Slice 8

Register Interest Experience Refresh:

- Slice 9

Composition-Reference Deep Linking:

- Slice 7

Enabling slice across all themes:

- Slice 3

## Standard Acceptance Checks

- [ ] User outcome is demonstrably true.
- [ ] Domain rule behavior is implemented or explicitly unchanged.
- [ ] Tests read like domain statements and cover changed behavior.
- [ ] Rendering states are complete (loading/empty/error/auth-required) where applicable.
- [ ] Unknown state handling is safe and legible.
- [ ] `pnpm run check` passes.
- [ ] Follow-up work is captured as new slices.

## Current Operating Note

Issue creation is intentionally deferred for now.  
When resumed, this document is the source for creating parent themes and first-batch slice issues.
