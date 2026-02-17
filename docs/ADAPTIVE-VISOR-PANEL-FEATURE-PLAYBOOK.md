# Adaptive Visor Panel Feature Playbook

Status: Working draft  
Updated: February 17, 2026

Related decisions:

- `docs/decisions/019-adaptive-visor-template-slot-architecture.md`
- `docs/decisions/021-adaptive-visor-panel-taxonomy-and-intent-matrix.md`
- `docs/decisions/022-adaptive-visor-layout-variants-and-collapsed-overflow.md`

Primary implementation files:

- `packages/web/src/hud/panels/core/panel-schema.ts`
- `packages/web/src/hud/panels/core/intent-matrix.ts`
- `packages/web/src/hud/panels/core/panel-layout-policy.ts`
- `packages/web/src/hud/panels/core/VisorPanelBody.tsx`
- `packages/web/src/hud/panels/core/panel-body-registry.tsx`
- `packages/web/src/hud/panels/core/widget-schema.ts`
- `packages/web/src/hud/widgets/index.ts`

Guardrail for write ownership:

- `packages/web/src/hud/panels/core/write-boundary.test.ts`

Debug and contract checks:

- `packages/web/src/hud/panels/core/AdaptiveVisorHarness.tsx` (open with `?adaptiveVisorHarness=1`)
- `packages/web/src/hud/panels/core/panel-body-registry.test.ts`
- `packages/web/src/hud/panels/core/panel-rendering-boundary.test.ts`
- `packages/web/src/hud/panels/core/widget-schema.test.ts`
- `packages/web/src/hud/panels/core/panel-ux.tsx`
- `packages/web/src/hud/panels/core/panel-ux.test.ts`

## Panel UX Contract v1

Use shared panel UX primitives for state surfaces instead of ad hoc copy/layout:

- info surfaces: `PanelInfoLoading`, `PanelInfoEmpty`, `PanelInfoError`, `PanelInfoAuthRequired`
- card surfaces: `PanelCardLoading`, `PanelCardEmpty`, `PanelCardErrorWithAction`
- section wrapper: `PanelSection`

Current goal: every panel should render loading/empty/error/auth-required states in a consistent visual and semantic pattern.

## Why This Exists

Use this as the practical planning layer for adaptive visor iteration:

- treat each panel as one independent feature slice
- keep panel purpose stable while implementation changes
- evolve layout behavior without ad hoc host conditionals
- keep writes routed through HUD/visor surfaces

## Roadmap

Prioritized rollout with rough effort sizing:

### Now (1-2 days each)

- `relationships` panel (S): read-only relationship visibility per organism.
- `regulatory-mode` widget (S): one-glance regulated vs open-trunk status.
- `proposal-pulse` widget (S): ambient open proposal pressure signal.

### Next (2-4 days each)

- `lineage` panel (M): ancestor and descendant fork trace.
- `events` panel (M): scoped event stream with lightweight filters.
- `boundary-path` widget (S/M): compact parent path for orientation.

### Later (4+ days each)

- `query` panel (L): cross-cutting retrieval without breaking curated map intent.
- `conflict-thread` panel (L): structured disagreement process visibility.
- `cybernetic-loop` panel (L): sensor/variable/prediction/response composition view.
- `economic` panel (L): paywall and revenue policy visibility.

## Panel Slice Template

Use this template when creating or revising any panel.

Panel ID:
Context:
Purpose:

Read dependencies:

- hooks/API reads used by this panel

Write dependencies:

- mutations this panel can trigger

Role behavior:

- main behavior
- secondary behavior
- collapsed behavior

Checklist:

- [ ] Purpose sentence in `panel-schema.ts` still matches actual behavior.
- [ ] `availableIn` logic matches intent (context, open-trunk, canWrite).
- [ ] Empty/loading/error states are explicit and understandable.
- [ ] Writes call HUD-owned form/section modules only.
- [ ] Mutation actions call `onMutate` where needed for refresh consistency.
- [ ] Collapsed label reads clearly as an action or destination.
- [ ] Secondary preview (if any) adds context without duplicating main body.
- [ ] At least one test covers availability or layout behavior impact.

## Current Panel Registry Checklist

### `threshold` (map)

Purpose: introduce a new organism and assume stewardship.

Write scope:

- `thresholdOrganism`

Checklist focus:

- [ ] Post-threshold flow opens the new organism in visor.
- [ ] Form copy keeps threshold lightweight and clear.
- [ ] Open-trunk explanation is explicit and short.

### `mine` (map)

Purpose: find organisms you can tend.

Write scope:

- none

Checklist focus:

- [ ] Loading and empty states help orientation.
- [ ] Selection always routes to visor organism context.
- [ ] List supports quick scanning (content type + name + preview).

### `templates` (map)

Purpose: instantiate template organisms.

Write scope:

- template instantiation flow

Checklist focus:

- [ ] Instantiation defaults are coherent without template-values.
- [ ] `template-values` handoff is reversible and clear.
- [ ] Successful instantiation bumps map refresh and opens visor.

### `template-values` (map temporary)

Purpose: customize template parameters before instantiation.

Write scope:

- template instantiation with explicit customization

Checklist focus:

- [ ] Temporary panel close returns to prior map flow.
- [ ] Validation errors anchor to specific fields.
- [ ] Completion path is identical to `templates` success path.

### `interior-actions` (interior collapsed action)

Purpose: open the entered organism in visor.

Write scope:

- none

Checklist focus:

- [ ] First click always opens visor (no URL-only state updates).
- [ ] Label stays action-oriented (`Tend current`).
- [ ] Hidden when no entered organism exists.

### `organism` / Tend (visor-organism)

Purpose: organism-first tending surface and entry point to universal layer.

Write scope:

- map surfacing action when unsurfaced

Checklist focus:

- [ ] Initial state is collapsed-only Tend entry point.
- [ ] Opening Tend reveals universal alternatives as collapsed.
- [ ] Surface action is clearly separate from composition.

### `composition` (visor-organism)

Purpose: compose/decompose organisms and navigate boundary structure.

Write scope:

- `composeChild`
- `decomposeChild`
- threshold + compose flow

Checklist focus:

- [ ] Parent and child navigation always opens in visor.
- [ ] Compose existing and create-and-compose are distinct actions.
- [ ] Decompose confirms state through immediate list refresh.

### `propose` (regulated visor-organism)

Purpose: open a proposal for a regulated organism.

Write scope:

- `openProposal`

Checklist focus:

- [ ] Never available on open-trunk organisms.
- [ ] Proposal creation is cleanly separate from integrate/decline.
- [ ] Completion gives clear return path to `proposals`.

### `proposals` (regulated visor-organism)

Purpose: inspect open/integrated/declined proposals and integrate/decline.

Write scope:

- `integrateProposal`
- `declineProposal`

Checklist focus:

- [ ] Open proposals expose integrate/decline only when authorized.
- [ ] Status labels are visually distinct and legible.
- [ ] Action-in-progress state prevents duplicate submits.

### `append` (open-trunk visor-organism)

Purpose: append state directly for open-trunk organisms.

Write scope:

- `appendState`

Checklist focus:

- [ ] Only available when `openTrunk === true`.
- [ ] Uses the same form ergonomics as `propose` where possible.
- [ ] Success copy confirms direct integration behavior.

### `history` (visor-organism)

Purpose: inspect state history.

Write scope:

- none

Checklist focus:

- [ ] Timeline remains useful with large state history.
- [ ] Empty history state is explicit, not ambiguous.
- [ ] Date formatting is consistent with proposal history.

### `governance` (visor-organism)

Purpose: inspect policy organisms and regulatory mode.

Write scope:

- none in current implementation

Checklist focus:

- [ ] Regulatory mode (regulated vs open-trunk) is explicit.
- [ ] Policy organisms are discoverable from this surface.
- [ ] Relationship to proposal behavior is explained in one sentence.

### `relationships` (visor-organism)

Purpose: inspect stewardship, integration authority, and membership relationships.

Write scope:

- none in current implementation

Checklist focus:

- [ ] Relationship types are grouped and clearly labeled.
- [ ] Membership role is shown when present.
- [ ] Empty state is explicit when no relationships are visible.

## Current Widget Registry Checklist

### `compass` widget

Visibility:

- map context only

Checklist focus:

- [ ] Always readable over map backgrounds.
- [ ] Never blocks panel interactions.
- [ ] Remains stable during panel transitions.

### `vitality` widget

Visibility:

- visor-organism when Tend or another universal panel is open

Checklist focus:

- [ ] Hidden when no universal panel is active.
- [ ] Fast to scan (recent changes, open proposals, contributors).
- [ ] Complements but does not duplicate history/proposals panels.

## Secondary Panel Pairing Recipes

Use these as initial defaults while iterating.

Map context:

- Main `templates` -> Secondary `mine`
- Main `threshold` -> Secondary `templates`
- Main `template-values` -> Secondary none (temporary focus)

Regulated visor-organism:

- Main `organism` -> Secondary `composition`
- Main `composition` -> Secondary `governance`
- Main `propose` -> Secondary `proposals`
- Main `proposals` -> Secondary `history`

Open-trunk visor-organism:

- Main `organism` -> Secondary `composition`
- Main `append` -> Secondary `history`
- Main `composition` -> Secondary `governance`

## Panel Ideas Backlog

### Phase 1 Safe Candidates

### `relationships` panel (visor-organism)

Intent:

- show who is related to the organism (membership, integration authority, visibility relationships)

Why this helps:

- makes stewardship and regulatory responsibility legible without opening systems view

Spec:

- `docs/ADAPTIVE-VISOR-RELATIONSHIPS-PANEL-SPEC.md`

### `lineage` panel (visor-organism)

Intent:

- show fork lineage (ancestor, descendants) for identity continuity

Why this helps:

- supports cross-boundary creative practice without losing provenance

### `events` panel (visor-organism or map)

Intent:

- event stream scoped to current organism or current map boundary

Why this helps:

- makes activity observable without conflating it with state history

### `query` panel (map)

Intent:

- cross-cutting retrieval by content type, vitality, or stewardship relationship

Why this helps:

- improves findability without turning the map into an auto-list

### Later Candidates (Post Phase 1)

### `conflict-thread` panel

Intent:

- direct path to conflict thread organisms linked to governance disagreements

### `cybernetic-loop` panel

Intent:

- inspect sensor/variable/prediction/response policy composition in one place

### `economic` panel

Intent:

- inspect paywall and revenue distribution policy organisms

## Widget Ideas Backlog

### Phase 1 Safe Candidates

### `proposal-pulse` widget

Visibility:

- visor-organism when proposals are open

Purpose:

- small ambient indicator of open proposal count and newest timestamp

### `regulatory-mode` widget

Visibility:

- visor-organism always

Purpose:

- one-glance indicator of regulated vs open-trunk mode

### `boundary-path` widget

Visibility:

- visor-organism when inside composition-heavy organisms

Purpose:

- compact parent path for quick orientation in deep composition work

### Later Candidates

### `sensor-health` widget

Purpose:

- quick health signal for sensor organisms feeding cybernetic loops

### `economic-signal` widget

Purpose:

- quick financial trend indicator derived from economic policy organisms

## Working Rules For Future Iteration

- Every new panel begins as a registry entry with one explicit purpose sentence.
- Every new write action must be reachable from HUD surfaces, not ad hoc rendering paths.
- Every new panel should declare at least one meaningful empty state.
- Secondary panels should complement the main panel, not duplicate it.
- Widgets are ambient signals; panels are action or inspection surfaces.
- If a panel starts carrying two jobs, split it.
