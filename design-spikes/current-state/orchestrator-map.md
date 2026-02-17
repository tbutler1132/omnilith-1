# Adaptive Visor Orchestrator Map (Current)

## Core Files

- Compositor state machine: `packages/web/src/platform/adaptive-visor-compositor.ts`
- Context wiring and dispatch: `packages/web/src/platform/PlatformContext.tsx`
- Rendering host: `packages/web/src/hud/AdaptiveVisorHost.tsx`
- HUD root and escape behavior: `packages/web/src/hud/Hud.tsx`

## Architecture Layers

1. **Compositor layer**
   - Computes `activePanels`, `activeWidgets`, `anchors`, `layoutHistory`, `intentStack`.
2. **Host layer**
   - Chooses which deck to render by context class (`map`, `visor-organism`, `interior`).
3. **Deck layout layer**
   - Resolves main/secondary/collapsed roles from panel schema + template + context.
4. **Panel body layer**
   - Maps panel IDs to concrete panel components.

## Context Derivation

Source: `deriveAdaptiveVisorContext` in `packages/web/src/platform/adaptive-visor-compositor.ts`

- `visorOrganismId` present -> `contextClass = 'visor-organism'`
- else `enteredOrganismId` present -> `contextClass = 'interior'`
- else -> `contextClass = 'map'`

## Compositor Events

| Event | Effect |
| --- | --- |
| `enter-map` | Resets to map location and recomputes/restores map layout |
| `focus-organism` | Updates focused organism without changing location |
| `enter-organism` | Enters interior location and clears visor target |
| `exit-organism` | Leaves interior location and returns to map context |
| `open-visor-organism` | Opens organism visor context for target organism |
| `close-visor-organism` | Closes visor organism context and falls back to spatial context |
| `set-altitude` | Updates altitude signal used by adaptive context |
| `toggle-map-panel` | Opens/closes one map panel (`threshold`, `mine`, `templates`) |
| `open-template-values` | Opens `template-values`, pushes intent/history |
| `close-temporary-panel` | Closes temporary panel and tries restore path |
| `mutation` | Bumps mutation token, clears temporary intent stack |

## Compositor Outputs

- `activePanels`: only major/map panel IDs (`visor-view`, `interior-actions`, map IDs)
- `activeWidgets`: context widget set
- `anchors`: fixed (`navigation-back`, `dismiss`)
- `layoutHistory`: snapshot ring buffer
- `intentStack`: used by template-values flow

## Context Widget Resolution

Source: `resolveWidgetsForContext` in `packages/web/src/platform/adaptive-visor-compositor.ts`

- map: `['map-actions', 'history-navigation', 'compass']`
- visor-organism: `['history-navigation', 'vitality']`
- interior: `[]`

## Host Rendering Map

Source: `packages/web/src/hud/AdaptiveVisorHost.tsx`

- map -> `VisorPanelDeck` with map template and map body registry
- visor-organism + `visor-view` active -> `OrganismPanelDeck`
- interior + `interior-actions` active -> collapsed-only `VisorPanelDeck` opening visor

## Escape Behavior

Source: `packages/web/src/hud/Hud.tsx`

- Escape closes visor organism first.
- If no visor target, Escape closes active map panel.
- `template-values` closes through temporary-panel event path.

## Intent/History Mechanics

- `open-template-values` pushes a temporary intent and stores current map snapshot.
- `close-temporary-panel` tries to restore prior map panel from history when mutation token matches.
- `mutation` invalidates restoration by bumping token.

## Decision Trace

- Trace can be enabled with query param `adaptiveVisorTrace=1`.
- Latest decisions are logged through `console.debug('[adaptive-visor]', ...)`.
