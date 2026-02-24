# 039 — Unsurfaced Effective Privacy and Recursive Space Accounting

## Context

Two exploitation paths remained open in Phase 1:

- an organism could remain unsurfaced yet still be shareable through visibility settings
- parent footprint derivation used direct child count, which allowed deep unsurfaced composition to undercount total space impact

This conflicted with the finite-space direction and with the intent that collaboration/shareability should require scarce surfaced space.

## Decision

### 1) Unsurfaced organisms resolve as effectively private

Access control now resolves an effective visibility level:

- if surfaced: use configured visibility (`public`, `members`, `private`)
- if unsurfaced: effective level is forced to `private`

Configured visibility may remain stored, but it is not effective until surfaced.

### 2) Surface detection uses current spatial-map state

An organism is surfaced when either condition is true:

- it appears in any current `spatial-map.entries[].organismId`
- it is itself a `spatial-map` organism (map organisms are surfaced anchors)

### 3) Surface size derives from recursive unsurfaced composition mass

`derive-surface-entry-size` now computes:

- `selfUnits` from the organism's own mass signal (or community map-area baseline)
- `unsurfacedDescendantUnits` recursively across unsurfaced children only
- `effectiveUnits = selfUnits + unsurfacedDescendantUnits`
- `size = clamp(min, max, sqrt(effectiveUnits))`

Surfaced descendants are excluded from ancestor recursion to avoid double counting.

### 4) No double counting rule

Within a surfaced boundary:

- unsurfaced descendant cost is charged upward through the nearest surfaced ancestor
- surfaced descendants carry their own surfaced footprint and are not charged to ancestors

## Rationale

- closes the off-map collaboration loophole
- keeps space scarcity enforceable through surfaced placement
- makes composition depth materially visible in footprint derivation
- preserves kernel structure by introducing surfaced state through a port, not a kernel special case

## Consequences

### Positive

- clearer coupling between surfacing and shareability
- stronger anti-evasion behavior for deep composition
- deterministic accounting path for later lease/capacity policy organisms

### Tradeoff

- access semantics are now coupled to surfaced state rather than purely configured visibility
- map organisms are treated as surfaced anchors in Phase 1 to preserve map legibility and world-map usability
- recursive derivation adds additional lookup work and may need optimization for very large composition graphs

## Status

Accepted.

Sizing normalization by target map capacity is amended by
`040-target-map-relative-surface-size-normalization.md`.
