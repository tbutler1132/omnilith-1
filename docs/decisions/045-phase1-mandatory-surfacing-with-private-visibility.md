# 045 — Phase 1 Mandatory Surfacing with Private Visibility

## Context

Recent direction established that map space should stay materially meaningful:

- organisms that matter should not operate as hidden "placeless" infrastructure
- stewards should still be able to threshold and tend organisms privately

An earlier decision (`039-unsurfaced-private-and-recursive-space-accounting.md`) kept an unsurfaced pathway and forced unsurfaced organisms to effective private visibility.

For the current Phase 1 shape (single world `map`), this creates unnecessary complexity and governance ambiguity.

## Decision

### 1) Every organism must be surfaced in Phase 1

At `threshold`, each new organism is surfaced on the world `map`.

### 2) Surfacing and visibility are separate concerns

Surfaced organisms may still have `private` visibility. Surfacing governs spatial presence; visibility governs who can view and interact.

### 3) Governance and composition require surfaced presence

An organism must be surfaced to participate in composition and proposal-evaluation flows. In Phase 1 this is always satisfied by rule (1).

### 4) No unsurfaced organisms in Phase 1

Phase 1 removes the operational unsurfaced state from normal behavior.

### 5) Scale path is boundary maps, not hidden space

If world-map density becomes too high, add additional boundary maps (`personal organism`, then `community`) while preserving the no-placeless-organism invariant.

## Rationale

- preserves the finite-space discipline ("everything takes space")
- keeps private incubation intact through visibility controls
- removes governance edge cases caused by unsurfaced exceptions
- keeps the Phase 1 model simple while preserving a clean scale path

## Consequences

### Positive

- no hidden long-lived "factory" organisms
- spatial legibility is consistent with governance legibility
- simpler policy and rendering semantics in Phase 1

### Tradeoff

- world-map clutter pressure appears sooner
- boundary-map introduction becomes a practical scaling milestone

## Status

Accepted (Phase 1 direction).

Amends `039-unsurfaced-private-and-recursive-space-accounting.md` by removing unsurfaced operation from Phase 1 behavior.
