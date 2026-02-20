# 031 — Canonical Natural Space with Optional Digital Visor Map Overlay

## Context

The current map rendering language leans visibly digital (for example grid-forward environmental cues). As the Space experience evolves, the baseline world needs to feel more lived, natural, and human without losing the utility of high-precision systems-oriented map interpretation.

At the same time, the existing digital map language remains valuable for orientation, diagnostics, and tending workflows.

## Decision

Adopt a dual rendering posture with strict ownership boundaries:

- Space remains canonical and should trend toward a natural, lived environmental aesthetic.
- Digital/grid-forward map treatment is preserved as an optional Visor overlay mode.
- The digital view is interpretive, not canonical. It augments Space but does not redefine it.
- Alternative map interpretations remain Visor concerns, while ambient world conditions remain Space concerns.

## Rationale

- Preserves experiential coherence: users remain in one canonical world.
- Aligns with the Space/Visor split: Space is what is, Visor is interpretation and control.
- Retains precision workflows without forcing a technical aesthetic as baseline reality.
- Enables progressive enhancement: canonical Space redesign can proceed without deleting existing digital map affordances.

## Consequences

### Positive

- Space can become warmer and more human while preserving high-signal systems tooling.
- Prevents "which reality am I in?" confusion by keeping overlays explicitly interpretive.
- Supports multiple future Visor map overlays without destabilizing canonical rendering.

### Tradeoff

- Requires clear overlay semantics and visual transitions so interpretive layers are legible but non-disorienting.
- Introduces additional rendering design work to maintain parity between natural and digital interpretation paths.

## Status

Accepted.
