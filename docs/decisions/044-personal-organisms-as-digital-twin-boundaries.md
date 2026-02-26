# 044 — Personal Organisms as Digital-Twin Boundaries

## Context

Phase 1 currently provisions a simple personal organism at signup.

As cybernetic regulation patterns become central (sensor, variable, prediction, response policy), we need a clear decision on where personal regulation lives:

- Option A: keep personal regulation organisms composed inside the personal organism boundary.
- Option B: keep personal regulation organisms as top-level standalone organisms not composed inside a personal boundary.

The architecture constraint remains unchanged:

- `user` is infrastructure, not an organism.
- regulation must be local to the organism boundary being tended.

## Decision

Adopt personal organisms as the canonical digital-twin boundary for personal tending, with staged complexity.

### 1) Keep the personal organism as the regulated boundary

Personal regulation organisms are composed inside the personal organism boundary (directly or via a dedicated regulation-bundle child).

### 2) Preserve a lightweight threshold baseline

Personal organisms still start simple at threshold. Regulation children are added incrementally as practice matures.

### 3) Keep user/person distinction intact

The personal organism represents a person's practice/trajectory, not the person themselves. Users remain infrastructure subjects.

### 4) Reserve top-level regulation organisms for reuse patterns

Standalone regulation organisms are valid when intentionally shared/reused across multiple boundaries, then composed/forked where needed.

## Rationale

- Keeps regulation semantics coherent: policy/sensor loops govern the specific boundary they are composed within.
- Aligns with the organism model: emergence through composition, boundary-local governance, explicit delegation.
- Supports phased adoption: immediate low-friction personal onboarding without blocking the long-term digital-twin direction.
- Avoids conceptual drift where "personal regulation" loses a clear parent boundary.

## Consequences

### Positive

- Personal tending and cybernetic loop composition share one clear home boundary.
- Querying and rendering remain legible (`what regulates this personal organism` is straightforward).
- Delegation can be explicit per regulation child without changing kernel semantics.

### Tradeoff

- Personal boundaries can become composition-heavy over time, requiring strong rendering support (universal layer + systems view) to stay navigable.
- Reusable regulation patterns require intentional composition/fork workflows rather than implicit global reuse.

## Status

Accepted (Phase 1 direction; incremental rollout from lightweight personal organism baseline).
