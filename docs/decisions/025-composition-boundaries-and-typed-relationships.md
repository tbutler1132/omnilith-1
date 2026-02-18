# 025 — Composition Boundaries and Typed Relationships

## Context

A strategic modeling question was raised: should the kernel model organism connections as generic edges instead of composition-as-containment?

The concern is valid. Generic edges are flexible and can express many kinds of structure. But Omnilith's kernel is responsible for boundary formation, visibility and access checks, proposal evaluation scope, and fork behavior. These safety-critical concerns need deterministic semantics.

Phase 1 also requires a stable, legible primitive that can be explained and implemented consistently across kernel, API, and rendering.

## Decision

Keep composition as containment in the kernel. Do not replace it with a generic edge primitive.

### 1) Composition remains the boundary mechanism

Kernel composition continues to mean: an organism is placed inside a containing organism boundary.

### 2) Generic edges are not a new kernel concern

The kernel does not add a ninth concern for free-form edge modeling in Phase 1.

### 3) Cross-boundary connections use typed relationships

Non-containment connections are modeled as typed relationship records (infrastructure category), not as composition.

Initial relationship types to keep explicit:

- `membership` (`user` -> community organism)
- `integrator-assignment` (`user` -> organism)
- `stewardship` (`user` -> organism)
- `lineage` (organism -> organism)
- `reference` (organism -> organism)

### 4) Relationships never define governance boundary

Relationships can connect across boundaries, but they do not define:

- proposal evaluation scope
- visibility and access boundary
- composition ownership
- automatic fork copy rules

### 5) Fork behavior remains composition-first

Fork copies the organism and its composed organisms. Relationship relinking is explicit and policy-driven, never implicit from graph adjacency.

### 6) Authority logic stays centralized

If a relationship type influences authority, capability resolution must remain in one central module.

## Rationale

- Boundary clarity is a core architectural requirement, not an optional convenience.
- Proposal evaluation remains local and predictable when scoped by containing organism boundaries.
- Visibility and access checks remain deterministic when boundary semantics are not overloaded by arbitrary edges.
- Fork semantics stay understandable and safe: copy composed organisms, then explicitly relink relationships as needed.
- Typed relationships preserve flexibility without sacrificing kernel legibility.

## Consequences

### Positive

- Kernel remains small and coherent for Phase 1.
- Governance behavior is easier to reason about and test.
- Cross-boundary connective tissue is still available through relationships.

### Tradeoff

- Some graph-like query use cases require relationship-aware query composition rather than one universal edge traversal.
- Relationship schema design becomes important earlier.

## Status

Accepted.
