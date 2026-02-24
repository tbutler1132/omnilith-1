# 038 — Web-Next Visor App Spatial Context Contract

## Context

`web-next` open visor mode now mounts multiple isolated apps and is expected to expand toward independent third-party apps.

Apps already receive targeted `organismId`, but they did not have a consistent contract for "where the user is in Space" when an app opens or while the user navigates. Without a shared contract, each app would infer map location differently, leading to drift and fragile behavior.

Architecture constraints are explicit:

- this must remain in rendering/app composition (`web-next`)
- kernel physics must remain unchanged
- map semantics must not become a new kernel concern

## Decision

Adopt a standardized, app-facing spatial context contract in `web-next` and pass it through visor app props.

### 1) Define a stable spatial context snapshot contract

Every open visor app receives:

- `mapOrganismId`
- `focusedOrganismId`
- `viewport` (`x`, `y`, `z`, `zoom`, `altitude`)
- `surfaceSelection`
- `boundaryPath`
- `timestamp`
- `coordinateSystemVersion`

### 2) Provide both snapshot and subscription semantics

`VisorAppRenderProps` includes:

- `spatialContext` (current snapshot)
- `onSpatialContextChanged(listener) => unsubscribe`

This allows apps to use initial context on mount and react to navigation updates deterministically.

### 3) Keep context sourcing in rendering

Context is emitted by `SpaceStage` and routed through:

- `PlatformShell` -> `VisorHud` -> `OpenVisorShell` -> active app component

No kernel ports or kernel operations are added.

### 4) Null-safe baseline behavior

When some context is unavailable, nullable fields are passed as `null` with a valid contract shape so apps can degrade gracefully without special-case host checks.

## Rationale

- Enables predictable app behavior around map location and navigation.
- Reduces duplicated, app-specific spatial inference logic.
- Preserves architecture boundaries by keeping spatial semantics out of kernel.
- Supports forward compatibility through `coordinateSystemVersion`.

## Consequences

### Positive

- Installable/independent apps can rely on one shared spatial contract.
- Open visor host can evolve while keeping app integration stable.
- Spatial behavior is testable at a contract seam instead of per-app heuristics.

### Tradeoff

- Adds host-side contract surface area that must be versioned carefully.
- Future coordinate model changes require compatibility strategy (`coordinateSystemVersion`) rather than silent mutation.

## Status

Accepted (`web-next`, Phase 1 rendering-layer contract baseline).
