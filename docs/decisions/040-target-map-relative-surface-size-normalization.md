# 040 — Target-Map Relative Surface Size Normalization

## Context

Decision 039 tightened privacy and recursive mass accounting, but size interpretation still felt abstract when viewed on large maps:

- the same organism could look too large on a large map
- visual footprint did not clearly communicate relative occupancy against the specific map being surfaced onto

For legibility, users should be able to read map icon size as a meaningful signal of relative scale in that map context.

## Decision

Normalize derived size against the **target map capacity**.

At derivation time:

1. Compute `effectiveUnits` (self + recursive unsurfaced descendants, excluding surfaced descendants).
2. Resolve target map capacity:

```txt
capacityUnits = floor((mapWidth * mapHeight) / (minSeparation * minSeparation) * 0.65)
```

3. Convert units to map-relative units using a fixed reference capacity (`2000x2000` at `minSeparation=48`):

```txt
normalizedCapacityFactor = referenceCapacityUnits / targetCapacityUnits
normalizedUnits = effectiveUnits * normalizedCapacityFactor
size = clamp(min, max, sqrt(normalizedUnits))
```

This keeps size comparable across maps while preserving map-relative visual truth.

## Rationale

- improves spatial legibility: icon size reflects occupancy pressure in the target map context
- preserves finite-space signaling without requiring manual per-map tuning
- avoids over-amplifying moderate organisms on large maps

## Consequences

### Positive

- same organism appears smaller on larger-capacity maps and larger on tighter maps
- community and non-community sizing both become map-context-aware
- world-map reading better matches “how much space this would consume here”

### Tradeoff

- size now depends on map context at surfacing time, not only organism intrinsic mass
- lease-fixed entries may need backfill when normalization logic changes

## Status

Accepted.

Amended by `041-boundary-proportional-world-map-sizing-and-unclamped-map-context-floor.md` for:

- boundary-proportional world-map transfer semantics
- removal of non-community map-context minimum floor inflation
