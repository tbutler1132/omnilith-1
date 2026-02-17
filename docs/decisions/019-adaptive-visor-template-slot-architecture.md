# 019 — Adaptive Visor as Template-Slot Architecture

## Context

The rendering work for the visor started as a pragmatic refactor under a feature flag (`adaptiveVisorCompositor=1`) to make panel behavior more adaptive and less mode-branch-heavy.

During implementation, two competing structures coexisted:

- A new adaptive panel model (main/collapsed roles, panel promotion/collapse, context-aware rules)
- Legacy rendering shapes from map-specific and visor-specific flows

This produced real UX inconsistencies:

- Collapsed chips appeared in different places by context
- Some adaptive views still felt like panel-within-panel shells
- The `Tend` workflow did not initially behave like a first-class panel role
- Architecture looked conceptually split even when behavior was close

The founder clarified the target model repeatedly:

- The visor should be a template with slots
- Slots should adapt dynamically by context and state
- Panels should take roles (`main`, `secondary`, `collapsed`) rather than being hardwired to one location
- Cues should remain a separate category
- No nested panel chrome unless explicitly designed later

The implementation was then reworked to match that model explicitly.

## Decision

Adaptive visor rendering is now defined as a template-slot architecture.

### 1) Single adaptive host for adaptive mode

Adaptive mode renders through one context-driven host:

- `packages/web/src/hud/AdaptiveVisorHost.tsx`

`Hud.tsx` no longer composes adaptive behavior by stitching separate map/visor components together. It delegates adaptive rendering to this host.

Legacy components remain only for non-adaptive fallback:

- `packages/web/src/hud/HudMapActions.tsx`
- `packages/web/src/hud/VisorView.tsx`

### 2) Explicit template schema with slot configuration

A typed template layer now defines adaptive layout behavior:

- `packages/web/src/hud/visor/template-schema.ts`

Template schema includes:

- `panelSlots.main` (`enabled`, `allowEmpty`, `presentation`)
- `panelSlots.secondary` (`enabled`, `maxPanels`)
- `panelSlots.collapsed` (`enabled`, `maxPanels`, `placement`)
- `widgetSlots.allowedWidgets`
- `cueSlots`
- `reservedAnchors`

Current templates:

- `map-core`
- `organism-core`
- `interior-core`

### 3) Panel layout policy consumes template slots

Panel role resolution (`main`, `secondary`, `collapsed`) is no longer controlled by ad hoc per-screen flags.

- `packages/web/src/hud/visor/panel-layout-policy.ts`

The policy now takes `slots` from template config and resolves panel roles deterministically using:

- panel eligibility
- panel role support
- template slot capacities
- context-aware priority scoring

### 4) `VisorPanelDeck` consumes template objects

`VisorPanelDeck` is the shared panel role engine, not a legacy component:

- `packages/web/src/hud/visor/VisorPanelDeck.tsx`

It now receives a typed `template` object and derives slot behavior from it, including collapsed rail placement.

### 5) `Tend` is a first-class panel (`organism`)

The organism tending surface is modeled as a panel in visor context:

- panel ID: `organism`
- context: `visor-organism`

When `organism` is main, universal panels are available as collapsed alternatives and can replace main on promotion.

To keep panel boundaries clear:

- regulated proposal creation lives in `propose`, while integration/decline lives in `proposals`
- `organism` (`Tend`) focuses on organism rendering and tending actions
- open-trunk append-state is represented by a dedicated `append` panel

### 6) Unified collapsed rail placement in adaptive mode

Collapsed chips are now governed by shared placement semantics (`panelSlots.collapsed.placement`) and currently use the same viewport location for map and organism templates.

### 7) Cue lane remains separate from panels/widgets

Cues are preserved as a distinct rendering category:

- `packages/web/src/hud/cues/*`

This keeps contextual popups/tutorial hints orthogonal to panel role mechanics.

### 8) Panel body contract: content-only inside slot chrome

Inline panel bodies rendered inside adaptive slot containers should not render their own outer shell.

Current enforced examples:

- `ThresholdForm` inline shell neutralized in panel slot bodies
- `HudTemplateValuesPanel` shell neutralized in panel slot bodies

## Rationale

This decision aligns rendering architecture with the organism model's core compositional logic:

- uniform primitive in infrastructure
- differential behavior through composition and rendering policy

A template-slot model gives the same clarity in rendering:

- one shared slot grammar
- context-specific template choices
- deterministic policy resolution
- evolvable configuration surface

It also reduces repeated tactical fixes:

- placement and role behavior move into schema/policy
- screens stop re-implementing layout assumptions
- adaptive mode becomes inspectable and testable as a system

## Tradeoffs

- Adds abstraction (template schema + slot policy) before all panel variants are fully mature.
- Requires dual-path maintenance while feature flag and legacy mode coexist.
- Demands discipline to keep panel bodies content-only in slot contexts.

These tradeoffs are accepted because they create an extensible architecture for forthcoming complexity (secondary slots, additional widgets, richer cue logic, collision management).

## Consequences

### Positive

- Adaptive behavior is conceptually unified and implementation-consistent.
- New adaptive layouts can be introduced by adding or modifying templates rather than rewriting host conditionals.
- Future addition of secondary-role render variants can be introduced without replacing the core model.

### Negative / Risk

- If template and panel schema drift, behavior can become hard to reason about.
- Without explicit documentation, future contributors may accidentally reintroduce nested-shell UI patterns.

## Follow-Up Work

1. Add explicit per-panel role render variants (`main`, `secondary`, `collapsed`) where needed.
2. Introduce template-aware collision policy for panels/widgets/cues (shared placement safety).
3. Remove legacy fallback components once adaptive mode is default and stable.
4. Expand tests from unit policy checks to integration tests for context transitions and slot occupancy.

## Status

Accepted and implemented under adaptive feature flag.
