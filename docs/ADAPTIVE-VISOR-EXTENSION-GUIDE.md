# Adaptive Visor Extension Guide

Status: Active implementation guide  
Updated: February 19, 2026  
Audience: Maintainers, agents  
Canonicality: Active implementation guide (defers to decision records)

## Purpose

This guide defines how to extend adaptive visor behavior without introducing host-level branching or policy drift.

Use this with:

- `docs/decisions/019-adaptive-visor-template-slot-architecture.md`
- `docs/decisions/021-adaptive-visor-panel-taxonomy-and-intent-matrix.md`
- `docs/decisions/022-adaptive-visor-layout-variants-and-collapsed-overflow.md`
- `docs/ADAPTIVE-VISOR-PANEL-FEATURE-PLAYBOOK.md`

If this document conflicts with those decisions, the decisions win.

## Source Map: Where Logic Goes

- `packages/web/src/platform/adaptive-visor-compositor.ts`
Purpose: context derivation and event-driven adaptive state transitions.
- `packages/web/src/hud/panels/core/panel-schema.ts`
Purpose: panel identity, availability, role support, and priority hints.
- `packages/web/src/hud/panels/core/intent-matrix.ts`
Purpose: context-specific scoring deltas for panel role selection.
- `packages/web/src/hud/panels/core/template-schema.ts`
Purpose: slot topology and widget allowance per context/template.
- `packages/web/src/hud/panels/core/panel-layout-policy.ts`
Purpose: deterministic role assignment (`main`, `secondary`, `collapsed`).
- `packages/web/src/hud/panels/core/panel-body-registry.tsx`
Purpose: typed mapping from panel IDs to panel body renderers.
- `packages/web/src/hud/AdaptiveVisorHost.tsx`
Purpose: thin rendering orchestration only.

## Non-Negotiable Guardrails

- Do not add panel ranking logic in host components.
- Do not add panel availability logic in host components.
- Do not add per-panel branching in `AdaptiveVisorHost` beyond typed routing.
- Do not add new local state machines in panel components for global visor behavior.
- Keep panel identity stable; add new panel IDs only in `panel-schema.ts`.
- Keep widget/panel/action boundaries strict.

## Standard Change Flows

### Add a New Panel

1. Add panel ID + definition in `panel-schema.ts`.
2. Add renderer mapping in `panel-body-registry.tsx`.
3. Update intent scoring (if needed) in `intent-matrix.ts`.
4. Update expected layout scenarios in `adaptive-visor-behavior-contract.ts`.
5. Add/adjust tests:
- `panel-body-registry.test.ts`
- `panel-layout-policy.test.ts`
- `adaptive-visor-behavior-contract.test.ts`

### Add a Layout Variant

1. Extend template resolution in `template-schema.ts` using template data, not host conditionals.
2. Keep role assignment in `panel-layout-policy.ts`.
3. Keep context transitions in `adaptive-visor-compositor.ts`.
4. Add or update contract scenarios for the variant.
5. Add or update deck/policy tests to verify slot occupancy and role outcomes.

### Change Context Transitions

1. Update compositor event handling in `adaptive-visor-compositor.ts`.
2. Update contract event vocabulary/scenarios in `adaptive-visor-behavior-contract.ts`.
3. Update compositor + contract tests to keep event -> decision -> layout trace explicit.

## Anti-Patterns (Do Not Do)

- "Quick fix" inside `AdaptiveVisorHost` with context-specific `if/else` policy branching.
- Introducing hidden panel IDs that are not declared in `panel-schema.ts`.
- Adding layout capacity logic outside templates/policy.
- Skipping contract updates when behavior changes.

## Definition Of Done

- Types compile and stay exhaustive.
- Contract scenarios match runtime behavior.
- Boundary tests still enforce host thinness.
- `pnpm run check` passes.
- Decision/playbook docs updated when panel taxonomy or adaptive behavior changes.

## Minimum Verification Commands

- `pnpm --filter @omnilith/web lint`
- `pnpm --filter @omnilith/web test`
- `pnpm run check`
