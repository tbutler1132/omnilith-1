# Current-State Pack Update Checklist

Use this checklist whenever Adaptive Visor behavior changes.

## Panel System

- [ ] Update panel IDs/availability from `packages/web/src/hud/panels/core/panel-schema.ts`.
- [ ] Update template slot rules from `packages/web/src/hud/panels/core/template-schema.ts`.
- [ ] Update role policy notes from `packages/web/src/hud/panels/core/panel-layout-policy.ts`.
- [ ] Update body mappings from `packages/web/src/hud/panels/core/panel-body-registry.tsx`.

## Orchestrator

- [ ] Update compositor events/state fields from `packages/web/src/platform/adaptive-visor-compositor.ts`.
- [ ] Update action wiring from `packages/web/src/platform/PlatformContext.tsx`.
- [ ] Update host routing notes from `packages/web/src/hud/AdaptiveVisorHost.tsx`.

## Widgets and Cues

- [ ] Update widget registry from `packages/web/src/hud/panels/core/widget-schema.ts`.
- [ ] Verify rendered widget paths in `packages/web/src/hud/widgets/` and host/deck files.
- [ ] Update cue registry/policy/anchors from `packages/web/src/hud/cues/`.

## Spike Artifacts

- [ ] Refresh `design-spikes/current-state/adaptive-visor-current-state.html` data objects.
- [ ] Refresh `design-spikes/current-state/panel-state-matrix.md`.
- [ ] Refresh `design-spikes/current-state/orchestrator-map.md`.
- [ ] Refresh `design-spikes/current-state/observations.md`.
