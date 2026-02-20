# 033 — Proposal Mutation Intents and Kernel Coherence Hardening

## Context

The organism model and kernel had begun to diverge in a few practical places:

- proposal language in docs and contracts implied "state-only" proposals
- composition operations were available but not consistently treated as proposal-governed mutations
- visibility updates in API paths did not consistently route through a kernel mutation use case with event emission
- vitality semantics needed to better reflect recent multi-signal activity

This created philosophical friction in the write path and made the governance model harder to explain cleanly.

## Decision

Adopt mutation-intent proposal semantics as the canonical model and align kernel/API behavior accordingly.

### 1) Proposal intents are first-class

A proposal is an offered mutation, not only an offered new state. Canonical mutation intents are:

- `append-state`
- `compose`
- `decompose`
- `change-visibility`

Legacy state-only proposal inputs remain accepted for compatibility and are normalized to `append-state`.

### 2) Kernel boundary consistency

- composition use cases enforce access at kernel boundaries by default
- visibility mutation flows route through a kernel use case and emit events
- proposal integration executes intent-specific mutation paths in kernel, not adapter-only shortcuts

### 3) Vitality semantics

Vitality derivation should reflect recent, multi-signal activity rather than only raw totals:

- `lastActivityAt` considers states, proposals, and events
- `recentStateChanges` uses a rolling recent window anchored to latest activity

## Rationale

- Restores philosophical coherence: one proposal mechanism for governed mutation flows.
- Preserves kernel role as safety-critical mutation boundary.
- Reduces UX confusion: proposal lifecycle is unified, while intent-specific UI can remain specialized.
- Improves observability and rendering signal quality through better vitality semantics.

## Consequences

### Positive

- Cleaner mapping between governance language and implementation.
- Better support for composition/visibility write paths without kernel special-casing per content type.
- Backward compatibility preserved for existing proposal rows and API callers.

### Tradeoff

- Proposal contracts become more explicit and slightly more complex.
- Renderers and clients should branch by proposal intent for best UX clarity.

## Status

Accepted.
