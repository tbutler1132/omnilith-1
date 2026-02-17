# Adaptive Visor Behavior Contract v1

## Source Of Truth

Machine-readable source:

- `packages/web/src/hud/contracts/adaptive-visor-behavior-contract.ts`

Executable conformance tests:

- `packages/web/src/hud/contracts/adaptive-visor-behavior-contract.test.ts`

Current runtime conformance target:

- `ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V1`

Next-model draft (pre-refactor target):

- `ADAPTIVE_VISOR_BEHAVIOR_CONTRACT_V2_DRAFT`
- `ADAPTIVE_VISOR_BEHAVIOR_EVENT_VOCABULARY_V2`
- `deriveAdaptiveVisorContextClassV2(...)`
- `applyAdaptiveVisorCanonicalEventV2(...)`

## Why This Exists

This contract holds adaptive visor behavior independently from React rendering details.

It defines:

1. Valid context classes and compositor event vocabulary.
2. Panel/widget/cue vocabularies.
3. Layout scenarios (`context inputs -> main/secondary/collapsed outputs`).
4. Compositor transition scenarios (`events -> resulting state`).

V2 draft additionally defines:

1. Canonical separation of `spatial location` and `visor target`.
2. Explicit open/close visor and promote/collapse panel events.
3. Context derivation rule: visor target wins over interior location.

## Sync Protocol

When adaptive behavior changes:

1. Update `adaptive-visor-behavior-contract.ts` first.
2. Update design spikes in `design-spikes/` to match contract intent.
3. Update runtime implementation files in `packages/web/src/hud` and `packages/web/src/platform`.
4. Run `pnpm run check`.
5. Confirm `adaptive-visor-behavior-contract.test.ts` still passes.

## Decision Rule

If implementation and spike disagree, contract is the arbiter until intentionally revised.
