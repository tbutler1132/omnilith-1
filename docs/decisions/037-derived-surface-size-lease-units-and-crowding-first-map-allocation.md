# 037 — Derived Surface Size, Lease Units, and Crowding-First Map Allocation

## Context

The world map already supports spatial footprint via `spatial-map.entries[].size`, and overlap prevention already scales by size and map separation rules.

Direction from recent decisions is also clear:

- map scarcity is real and policy-governed
- allocation should be lease-like stewardship capacity, not permanent land ownership
- anti-hoarding constraints are required
- currency/economic mechanisms should be implemented as organisms through content types and composition

What remained unclear was how `size` is determined and how lease pressure and crowding pressure should interact.

## Decision

### 1) `entry.size` is system-derived, not user-entered

Surface size is computed by infrastructure/app policy logic at surfacing time. Callers do not directly set arbitrary footprint.

### 2) Community size is derived from its spatial map area

For community organisms, size is tied to the exact size of the community's referenced map (`mapOrganismId`):

```txt
communitySize = clamp(0.75, 6.0, sqrt((mapWidth * mapHeight) / (2000 * 2000)))
```

This keeps community world-map presence proportional to the boundary it tends.

### 3) Non-community size uses a compositional mass formula

For non-community organisms:

```txt
payloadBytes = byteLength(JSON.stringify(currentState.payload))
intrinsicMass = max(1, payloadBytes / 1200)
historyMass = 0.35 * log2(1 + stateCount)
compositionMass = 0.5 * log2(1 + childCount)
rawSize = 0.7 + 0.5 * log2(1 + intrinsicMass) + historyMass + compositionMass
size = clamp(0.75, 4.5, rawSize)
```

Constants are accepted as Phase 1 defaults and may be tuned without changing model structure.

### 4) Lease accounting uses area-like units

Lease consumption is quadratic in size:

```txt
unitsRequired = ceil(size * size)
```

A surfacing mutation must satisfy:

```txt
usedUnits + unitsRequired <= leasedUnits
```

If it does not, mutation is declined unless an expansion mutation is integrated first.

### 5) Crowding pressure gates surfacing before pure lease exhaustion

Global map occupancy is computed with a density-adjusted capacity estimate:

```txt
capacityUnits = floor((mapWidth * mapHeight) / (minSeparation * minSeparation) * 0.65)
occupiedUnits = sum(ceil(entry.size * entry.size))
occupancyRatio = occupiedUnits / capacityUnits
```

Policy thresholds:

- `occupancyRatio >= 0.60`: warning lane
- `occupancyRatio >= 0.75`: surcharge lane
- `occupancyRatio >= 0.85`: block new surfacing except designated commons lane

### 6) Local overcrowding adds placement-level constraints

For a candidate placement, compare nearest-neighbor spacing:

```txt
spacing = distance / (minSeparation * max(sizeA, sizeB))
```

- any spacing `< 1.0`: decline (overlap)
- median nearest-3 spacing `< 1.25`: decline (overcrowded pocket)
- median nearest-3 spacing `< 1.6`: warn

### 7) Size is lease-fixed at integration time in Phase 1

At surfacing integration, computed size is written to map entry and treated as fixed for that lease period.

If the organism's underlying mass later exceeds current allocation, a follow-up expansion path is required. This avoids continuous churn in map entries during Phase 1.

## Rationale

- Preserves the finite-habitat feel of the world map.
- Keeps footprint meaningful and legible by deriving it from organism reality.
- Ensures communities occupy world-map presence proportional to the boundaries they compose.
- Makes scarcity governable through leases and policy, not ad hoc manual sizing.
- Produces the intended dynamic where practical crowding pressure is often encountered before absolute lease exhaustion.

## Consequences

### Positive

- Eliminates arbitrary manual footprint inflation/deflation.
- Aligns pricing/allocation with spatial impact.
- Gives policy organisms clear levers: lease caps, surcharges, reclaim thresholds, commons exceptions.
- Keeps kernel unchanged; implementation remains additive in content types, policies, and adapters.

### Tradeoff

- Formula constants require calibration against real usage patterns.
- Lease-fixed size can lag organism growth until expansion is processed.
- Full atomicity for economic debit + map append may still require a future extension if strict one-step settlement becomes mandatory.

## Status

Accepted (Phase 1 constants accepted; calibration expected through policy state updates).
