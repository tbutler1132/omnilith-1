# 030 — Visor/HUD Extension Host with Default-First Delivery

## Context

The current adaptive visor architecture already uses templates, panel taxonomy, and deterministic slot policy. Phase 1 delivery still prioritizes a strong first-party default tending experience.

At the same time, long-term product direction requires installable visor/HUD apps so communities can add or replace interaction surfaces without changing kernel or API behavior.

## Decision

Adopt an extension-host direction for rendering with staged delivery:

- Kernel and API proposal/composition/visibility behavior remain canonical and unchanged.
- Visor/HUD customization is a rendering-layer concern only.
- Phase 1 continues to prioritize first-party default panels and flows.
- Extension seams are introduced now behind default behavior (registry/resolver contracts) so later installable apps can plug in without host rewrites.
- All extension actions must route through existing API endpoints and capability checks.

## Rationale

- Preserves architectural integrity: universal physics in infrastructure, flexible behavior in rendering.
- Prevents lock-in to one authored panel flow while keeping current delivery velocity.
- Makes future installability incremental instead of requiring a large rendering rewrite.

## Consequences

### Positive

- Default experience can ship quickly while remaining future-extensible.
- Communities can eventually install domain-specific tending tools.
- Multiple proposal/tending experiences can coexist while sharing one regulatory backend.

### Tradeoff

- Adds extension-contract surface area before full install/runtime isolation is implemented.
- Requires discipline to keep extension behavior out of kernel and API special-casing.

## Status

Accepted.
