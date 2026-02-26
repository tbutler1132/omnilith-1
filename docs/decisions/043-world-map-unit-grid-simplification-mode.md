# 043 — World-Map Unit-Grid Simplification Mode

## Context

While making major structural changes, map semantics had become too complex for the current phase:

- surfaced entry size used multi-factor derivation
- legacy `community` entries remained surfaced on the world map
- seed profiles depended on nested community-map structures

This made core navigation and tending harder to reason about during active redesign.

## Decision

1. Enter a temporary simplification mode for world-map behavior.
2. Treat every surfaced organism as one unit exactly (`size = 1`).
3. Treat map placement as unit-grid semantics with integer coordinates.
4. Standardize world-map geometry to bounded finite dimensions (`5000 x 5000`) with `minSeparation = 1`.
5. Keep `community` content type registered for compatibility, but stop using it as an active surfaced path in web-next/seed flows.
6. Use one parent Text boundary with an Integration Policy organism as the default governing anchor for simplified seeds.
7. Provide a migration script to normalize existing world-map data and unsurface legacy surfaced `community` entries.

## Rationale

- major architecture changes need deterministic, low-ambiguity map behavior
- unit-grid occupancy is easy to reason about and test
- keeping community registered avoids unnecessary compatibility breakage while reducing active complexity
- a dedicated migration path avoids forcing full database resets

## Consequences

### Positive

- surfacing semantics become predictable and uniform
- world-map rendering and debugging are simpler
- seed profiles are faster to understand and maintain during the rewrite

### Tradeoff

- derived size semantics are intentionally paused, so world-map size no longer communicates compositional mass during this mode

## Status

Accepted.
