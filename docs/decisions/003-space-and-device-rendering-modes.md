# 003 — Space and Device: Two Modes of Rendering

## Context

The rendering layer needed a clearer model for how users engage with the platform. The Foundation describes the platform as a place, not a product, and emphasizes absorption as the primary experiential mode. But users also need to act — edit, compose, propose, review policies, manage organisms. These two needs (experiencing and acting) pull in different directions.

## Decision

The rendering layer is organized into two modes:

**The space.** The world itself — a spatial environment where organisms exist with position, scale, and presence. Users move through it, encounter organisms, listen, read, absorb. The space is how spatial-map organisms get rendered. This is the default state.

**The device.** A personal interface each user carries. Pulled up when they need to act rather than experience. Contains the universal layer, the systems view, and cross-cutting query views (my proposals, my policies by content type, organisms I can integrate, etc.). The device is a deliberate shift from absorption to action.

Both modes are pure rendering concerns. The kernel has no concept of space or device.

## Rationale

- **Preserves absorption.** The Foundation says "the system tracks time so the inhabitant can lose it." Separating the action interface from the spatial experience keeps the default state absorptive.
- **No kernel changes.** The space renders spatial-map organisms. The device renders the universal layer and query results. Both use existing infrastructure.
- **Device views are just queries.** "My policies" is a query filtered by content type on current state. "My proposals" is a query on the proposal repository by author. The query port (infrastructure concern #8) already supports this.
- **Matches the aesthetic spectrum.** The space is the elegant, beautiful surface. The device is the deeper, more structural layer. The systems view inside the device is where the organism primitive becomes visible.
