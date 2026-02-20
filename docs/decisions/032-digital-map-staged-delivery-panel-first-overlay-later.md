# 032 — Digital Map Staged Delivery: Panel First, Overlay Later

## Context

The product direction now distinguishes canonical Space from interpretive Visor views. The digital/grid-forward map language should remain available as a Visor capability.

A true field-of-vision overlay is compelling but introduces new interaction semantics and lifecycle complexity compared to current adaptive panel mechanics.

In parallel, the same high-attention presentation surface is useful for other rendering cases (for example video playback and unsurfaced organism previews).

## Decision

Adopt staged delivery for digital map rendering:

- Phase 1 implementation uses a near full-screen adaptive Visor main panel, not a true overlay system.
- A compact mini-map widget may complement the panel for persistent orientation.
- Digital map navigation is preview-only until explicit commit.
- Selecting a destination in digital map requires explicit `Fast travel`.
- `Fast travel` commits canonical Space movement and closes the digital map panel.
- True field-of-vision overlay mode remains a future enhancement after panel behavior is validated.

## Rationale

- Reuses existing adaptive visor panel architecture and delivery path.
- Minimizes implementation risk while preserving architectural boundaries.
- Keeps movement semantics clear: interpret in Visor, move in Space.
- Creates a reusable high-attention panel primitive for additional use cases before overlay complexity is introduced.

## Consequences

### Positive

- Faster delivery with lower architectural disruption.
- Consistent user mental model around explicit movement commits.
- Reusable near full-screen panel capability for media and preview experiences.

### Tradeoff

- Initial experience will not yet deliver full visor-overlay immersion.
- A later overlay migration step will still be required if that mode is desired.

## Status

Accepted.
