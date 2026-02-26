# 042 — Map-Scale-Neutral Grid Rendering and Small-Text Surface Sizing

## Context

After Decisions 040 and 041, two regressions appeared in the space rendering flow:

- short text organisms could still appear oversized on boundary maps after migration/backfill
- grid lines and glow could look thicker on community maps than on the world map, even at the same altitude

This created a legibility mismatch between semantic map scale and perceived visual weight.

## Decision

1. Adjust compositional mass sizing for map-context derivation so short text organisms remain small by default.
2. Clamp target-map capacity normalization so smaller maps do not inflate organism size above reference-map scale.
3. Recompute existing map entries with the updated derivation logic via migration/backfill.
4. Normalize ground-plane line and glow geometry by map zoom scale (not live zoom), including stroke width and glow blur inputs.
5. Keep focus framing at preview zoom (mid-level framing) so focusing an organism preserves local context.

## Rationale

- semantic size should represent organism mass and boundary share, not accidental map-capacity amplification
- visual rendering should preserve consistent line/glow perception across maps
- zoom interaction smoothness is preserved when normalization is static per map profile rather than recomputed per-frame from live zoom

## Consequences

### Positive

- short text organisms now read as genuinely small on community maps
- world map and community map grid presentation is visually closer in perceived thickness
- focus interactions remain context-preserving instead of jumping to over-tight framing

### Tradeoff

- map-level normalization introduces additional rendering constants that may require future tuning if altitude profiles change significantly

## Status

Accepted.
