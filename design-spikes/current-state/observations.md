# Current-State Observations

These are implementation observations from the current Adaptive Visor code. They are not necessarily bugs, but they are worth deciding on explicitly.

## 1. `map-actions` widget is declared but not rendered

- Declared in widget schema: `packages/web/src/hud/panels/core/widget-schema.ts`
- Emitted by compositor in map context: `packages/web/src/platform/adaptive-visor-compositor.ts`
- Allowed by map template: `packages/web/src/hud/panels/core/template-schema.ts`
- No rendering path found in host/widget lane: `packages/web/src/hud/AdaptiveVisorHost.tsx`, `packages/web/src/hud/widgets/index.ts`

Impact:

- Widget taxonomy says map has three widgets, but only compass is visually rendered as a lane widget.

## 2. Cue anchor schema includes `visor-pill`, but no anchor instance exists

- Cue target union includes `visor-pill`: `packages/web/src/hud/cues/cue-schema.ts`
- No element with `data-cue-anchor="visor-pill"` found in current HUD render tree.

Impact:

- Cue targeting vocabulary is broader than current rendered anchors.

## 3. `VitalitySection` exists but is not wired into panel registry

- Exported in sections index: `packages/web/src/hud/panels/organism/sections/index.ts`
- Not mapped in universal visor panel registry: `packages/web/src/hud/panels/core/panel-body-registry.tsx`
- Vitality currently appears as widget (`VitalityWidget`) not panel.

Impact:

- Two vitality UI patterns exist, but only widget path is active.

## 4. Cue policy is hardcoded to adaptive-enabled context

- `resolveActiveHudCues` receives `adaptiveEnabled: true` in `HudCueLayer`: `packages/web/src/hud/cues/HudCueLayer.tsx`

Impact:

- If adaptive mode flagging changes later, cue policy currently does not read compositor state.

## 5. `interior-actions` panel is collapsed-only with no body

- Registry role support disables main and secondary: `packages/web/src/hud/panels/core/panel-schema.ts`
- Host renders `VisorPanelDeck` with `renderPanelBody={() => null}` in interior context: `packages/web/src/hud/AdaptiveVisorHost.tsx`

Impact:

- Works as a quick “open visor” chip, but there is no interior main-panel affordance.

## Suggested Next Cleanups

1. Decide whether `map-actions` should be removed from widget registry/template or implemented as a rendered widget.
2. Remove `visor-pill` cue anchor from schema or add the anchor in HUD rendering.
3. Decide whether vitality should stay widget-only or get a formal panel entry.
4. Decide whether cue policy should read adaptive state from platform context.
