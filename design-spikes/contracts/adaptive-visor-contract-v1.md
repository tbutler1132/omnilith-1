# Adaptive Visor Contract v1

## Artifacts

- Spike: `design-spikes/visor/adaptive-visor-layout-v1.html`
- React targets:
  - `packages/web/src/hud/panels/core/VisorPanelDeck.tsx`
  - `packages/web/src/hud/panels/core/panel-layout-policy.ts`
  - `packages/web/src/hud/panels/core/panel-schema.ts`
  - `packages/web/src/hud/panels/core/template-schema.ts`
  - `packages/web/src/hud/panels/core/AdaptiveVisorHarness.tsx`

## Purpose

Design slot behavior and panel promotion flow independent from data rendering details.

## Topology Contract

- Main slot: centered overlay when enabled.
- Secondary slot: visible when template allows (`maxPanels` respected).
- Collapsed rail: always visible when collapsed slot enabled.
- Context classes represented:
  - `map`
  - `visor-organism`
  - `interior`

## Context Inputs

- `canWrite`
- `openTrunk`
- `surfaced`
- `templateValuesReady`
- `interiorOrigin`
- `preferredMainPanelId`

## Interaction Contract

1. Changing context updates available panel set.
2. Toggling inputs updates availability in real time.
3. Promoting a collapsed panel sets preferred main panel.
4. Clearing preferred main falls back to policy resolution.
5. Visible layout lists available, main, secondary, and collapsed panels.

## Visual Contract

- HUD framing and tone remain consistent with panel spikes.
- Main/secondary/collapsed roles are visually distinct.
- Layout remains understandable at a glance.

## Accessibility Contract

- Buttons for toggles and panel promotion are keyboard reachable.
- Active context and selected panel are indicated.

## Translation Notes

- Spike JS logic should remain an approximation only.
- Final role resolution remains in `panel-layout-policy.ts`.
- Keep intent matrix behavior as source of truth in implementation.

## Open Questions

- Whether secondary slot needs richer affordances for panel shortcuts.
- Whether collapsed rail ordering should expose priority scores in debug mode.
