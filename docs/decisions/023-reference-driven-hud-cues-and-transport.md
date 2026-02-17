# 023 — Reference-Driven HUD Cues and Transport

## Context

A practical modeling tension surfaced while designing a Hero's Journey album organism:

- stage organisms need lightweight candidate references
- contributors often need to jump from a referenced `audio` mix to its containing `song` boundary to propose source/stems changes
- hardcoding music-specific actions into `composition-reference` would violate the generic content type model

The core question: how do we keep `composition-reference` generic while still making referenced organisms easy to act on?

## Decision

`composition-reference` remains generic, and the HUD gains capability-driven cues and transport controls.

### 1) `composition-reference` stays structural-only

The content type continues to store only:

- referenced `organismId`s
- arrangement metadata (`position`, grouping, arrangement type)

No domain-specific fields like `songId`, `mixId`, or specialized navigation actions are added.

### 2) Renderer-to-HUD cues use a generic contract

Renderers can emit contextual cues to the HUD cue lane using action-intent IDs (not domain labels). Initial cue intents:

- `open-referenced-organism`
- `open-containing-organism`
- `play-preview`

Cue labels in the HUD are generated from resolved organism metadata at runtime.

### 3) Parent navigation is structural, not music-specific

When a referenced organism has a parent, the HUD can surface a cue to open that containing organism.

This uses the existing parent query path and single-parent composition model, not content-specific relationships.

### 4) HUD transport is a first-class widget

Add a `transport` widget in the widget lane for persistent playback control:

- play/pause
- current item title/source
- optional next/previous when queue is present

The transport is global to the current tending session, not owned by any specific content type.

### 5) Playback is capability-driven

`play-preview` appears only when the referenced organism's current state is playable (initially `audio` content type). This is resolved through content-type capability checks, not string-matching labels like "mix."

### 6) Proposal and governance boundaries are unchanged

HUD cues and transport do not change regulatory boundaries. They improve navigation and encounter flow only.

Proposal/integration still happens on the organism where coherence is held (for example, `song` for source/stems governance).

## Rationale

This preserves architectural integrity while improving practical usability:

- keeps content types generic and composable
- avoids encoding studio-specific assumptions in shared contracts
- leverages the existing adaptive cue lane as intended
- makes reference-heavy organisms usable without flattening boundary semantics

It aligns with prior decisions:

- adaptive cue lane remains distinct from panels/widgets (019/021)
- rendering behavior is policy-driven and context-aware, not host-level branching
- new behavior enters through rendering and composition, not kernel special-cases

## Consequences

### Positive

- Reference-driven workflows become fast without losing structural clarity.
- The same cue system can support non-audio reference patterns later.
- `composition-reference` remains reusable across domains.

### Risk

- Cue density may become noisy if too many reference actions surface at once.
- Capability checks must stay centralized or they will drift into ad hoc renderer logic.
- Global transport lifecycle (who owns queue state, when it resets) can become ambiguous without a clear contract.

## Implementation Plan

### Phase 1 — Cue Contract and Runtime Resolution

1. Define a typed cue contract for renderer-emitted intents (`play-preview`, `open-referenced-organism`, `open-containing-organism`).
2. Add a small cue dispatcher in platform state so active renderer context can publish/clear cues.
3. Update cue lane rendering to consume cue intents and show resolved labels.

### Phase 2 — `composition-reference` Integration

1. Upgrade the `composition-reference` renderer to resolve referenced organism summaries (name + content type).
2. Resolve optional parent summaries for referenced organisms.
3. Emit cue intents per selected/focused reference row.
4. Wire cue actions to existing visor navigation APIs (`openInVisor`, parent open).

### Phase 3 — Transport Widget

1. Add `transport` widget definition and allow-list it in relevant visor templates.
2. Implement transport store (current source, play state, optional queue).
3. Wire `play-preview` cues to transport actions.
4. Start with `audio` support only; keep capability extension points explicit for later types.

### Phase 4 — UX Safety and Policy

1. Add cue prioritization rules so rail density remains legible.
2. Add explicit fallback states:
   - referenced organism missing
   - parent missing
   - non-playable reference
3. Ensure guest mode behavior remains read-only (playback allowed, mutations gated).

### Phase 5 — Tests

1. Unit tests for cue contract state transitions.
2. Integration tests for:
   - reference selection -> cue surfacing
   - open referenced organism
   - open containing organism
   - play-preview -> transport state update
3. Regression tests to ensure no panel/widget boundary violations.

## Acceptance Criteria

1. `composition-reference` payload/schema remains unchanged and generic.
2. From a reference row, user can open the referenced organism in the visor.
3. If the referenced organism has a parent, user can open the containing organism from a cue.
4. If referenced organism is playable (`audio`), user can start playback from HUD cue and control it in HUD transport.
5. No kernel changes are required.
6. No music-specific labels are hardcoded in shared content type contracts.

## Status

Accepted as implementation plan; staged for execution.
