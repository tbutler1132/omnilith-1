# 041 — Boundary-Proportional World-Map Sizing and Unclamped Map-Context Floor

## Context

After Decision 040, users still observed small non-community organisms appearing too close in size to community organisms on the world map.

The core readability requirement was clarified:

- if a non-community organism is moved from its boundary map to the world map,
- its world-map icon should preserve the same occupancy proportion relative to its boundary community icon
- map-context derivation should show the real computed value, not a default non-community floor

## Decision

1. Keep boundary transfer as the canonical world-map rule for non-community organisms that resolve to a source boundary community:

```txt
sourceBoundaryShare = effectiveUnits / sourceBoundaryCapacityUnits
transferredArea = sourceBoundaryShare * (targetCommunityIconSize^2)
transferredSize = sqrt(transferredArea)
```

2. For map-context derivation (`mapOrganismId` provided), remove the non-community minimum visual floor (`0.75`) so values can become truly small when proportional math demands it.

3. Keep a tiny positive epsilon floor only for validator safety (`size > 0`), not for visual inflation.

## Rationale

- preserves visual truth: world-map size reflects boundary occupancy share
- prevents arbitrary inflation of small non-community organisms on large maps
- keeps finite-space semantics coherent across nested boundaries

## Consequences

### Positive

- world-map non-community entries can be meaningfully tiny when they represent tiny boundary share
- comparisons between boundary community icons and their surfaced child organisms become more interpretable

### Tradeoff

- very small entries can be harder to notice visually and may need later rendering affordances (selection halos, zoom cues) rather than numeric inflation

## Status

Accepted.
