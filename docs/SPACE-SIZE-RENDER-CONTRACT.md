# Space Size Render Contract

Status: Active  
Updated: February 26, 2026

## Purpose

Define the contract between:

- canonical surface size truth (`spatial-map.entries[].size`) and
- rendering-layer readability policy (how markers and grid are drawn in `web-next`)

This prevents semantic size and visual size from drifting silently.

## 1. Canonical Size Truth (API)

1. Canonical size is stored on the map state as `spatial-map.entries[].size`.
2. Size derivation is done in API surface logic (`derive-surface-entry-size.ts`), not in the client.
3. Community entries derive from map-area share.
4. Non-community entries derive from compositional mass and boundary transfer rules.
5. `curationScale` is bounded (`0.85` to `1.15`) when present.

## 2. UI Representation Contract (Web)

1. UI treats `entry.size` as the semantic source-of-truth multiplier.
2. High/mid altitude may apply readability boosts.
3. Close altitude converges to proportional truth.
4. Interaction uses a minimum hit-size floor.
5. Focused entries use a minimal visible-core floor.
6. All marker thresholds/constants live in:
   `packages/web-next/src/space/organism-size-render-contract.ts`

## 3. Grid Consistency Contract

1. Grid line/glow should be visually consistent across world and boundary maps.
2. Grid geometry normalization uses map zoom profile scale (static per map), not per-frame live zoom.
3. Line stroke and glow blur are normalized together.

## 4. Invariants

1. Semantic size changes require API derivation updates and migration/backfill for existing maps.
2. Rendering constants may change without mutating stored map states.
3. If a visual tweak changes perceived relative size, update this contract and decision docs.

