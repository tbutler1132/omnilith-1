# Threshold Contract v1

## Artifacts

- Spike: `design-spikes/panels/threshold-v1.html`
- React target: `packages/web/src/hud/panels/forms/ThresholdForm.tsx`
- Registry mapping: `packages/web/src/hud/panels/core/panel-body-registry.tsx`

## Purpose

Guide a steward through threshold with high confidence and low cognitive load.

## Required States

- `default`: form ready for input.
- `loading`: threshold submission in progress.
- `empty`: no meaningful input yet.
- `error`: invalid input or failed threshold.
- `auth-required`: user cannot threshold in guest mode.

## Interaction Contract

1. Name is entered first.
2. Content type is explicitly selected.
3. Initial state payload is visible and editable.
4. Integration mode is selected:
   - `Review First`
   - `Instant Integrate (open-trunk)`
5. "What happens next" copy updates based on integration mode.
6. Summary reflects selected identity/type/mode.
7. Primary action is `Threshold Organism`.

## Visual Contract

- Keep cinematic Omnilith HUD tone (dark surface + violet accent).
- Keep progressive step visibility (Name, Content Type, Initial State, Integration Mode).
- Preserve clear decision framing for integration mode.
- Preserve action hierarchy (primary then secondary).

## Accessibility Contract

- Keyboard traversal follows visual order.
- Active content type and mode expose selected state.
- Error state text appears adjacent to failing field.

## Translation Notes

- Do not alter form semantics when styling.
- Keep existing domain language (`threshold`, `open-trunk`, `proposal`, `integrate`).
- Keep behavior parity with existing validation and payload handling.

## Open Questions

- Whether format selector for text should remain inline or become compact.
- Whether payload helper examples should become expandable blocks.
