# Adaptive Visor Current-State Pack

This folder snapshots the current implementation state of the Adaptive Visor system.

Use this pack to:

1. See what exists today before designing new spikes.
2. Avoid designing flows that conflict with live orchestration behavior.
3. Identify implementation gaps before translation work.

## Files

- `design-spikes/current-state/adaptive-visor-current-state.html`
  Interactive snapshot of panel, widget, cue, and orchestrator topology.
- `design-spikes/current-state/panel-state-matrix.md`
  Complete panel inventory with renderer mapping and state surfaces.
- `design-spikes/current-state/orchestrator-map.md`
  Event/state map for the adaptive compositor and host wiring.
- `design-spikes/current-state/observations.md`
  Noted mismatches and potential cleanup opportunities.
- `design-spikes/current-state/UPDATE-CHECKLIST.md`
  Fast refresh checklist when adaptive implementation changes.

## Source Of Truth

All entries in this pack are mapped from current code in:

- `packages/web/src/hud/`
- `packages/web/src/platform/adaptive-visor-compositor.ts`
- `packages/web/src/platform/PlatformContext.tsx`

If implementation changes, update this pack first, then design spikes.
