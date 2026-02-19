# Adaptive Visor Relationships Panel Spec

Status: Implemented (Phase 1 read path)  
Updated: February 19, 2026  
Audience: Maintainers, agents  
Canonicality: Active panel specification (implemented baseline)

## Intent

Add a dedicated `relationships` panel in visor-organism context so stewardship and integration authority are directly legible while tending an organism.

This panel is read-only in Phase 1.

## Panel Contract

Panel ID: `relationships`  
Context: `visor-organism`  
Purpose: inspect relationship connective tissue between users and the current organism.

## Initial Scope (Phase 1)

- Show relationship entries from `GET /organisms/:id/relationships`.
- Group entries by relationship type:
- `stewardship`
- `integration-authority`
- `membership`
- Show membership role when present (`founder`, `member`).
- Show compact user identity and creation timestamp.
- Include explicit loading and empty states.

## Out of Scope (Phase 1)

- Creating, editing, or removing relationships.
- Role mutation workflows.
- Cross-organism relationship browsing.
- Conflict resolution workflows.

## UX Notes

- This panel complements `governance`; it does not replace it.
- `governance` answers "is this boundary regulated?"
- `relationships` answers "who currently holds relationship responsibilities here?"
- If no relationships are visible, show a clear empty state:
- "No relationships visible for this organism."

## Data Contract

Source type: `Relationship` from `@omnilith/kernel`.

Required fields used by the panel:

- `id`
- `type`
- `userId`
- `organismId`
- `role` (optional, membership only)
- `createdAt`

## Implementation Plan

1. Add a dedicated section component:
- `packages/web/src/hud/panels/organism/sections/RelationshipsSection.tsx`

2. Add presentation helpers:
- `packages/web/src/hud/panels/organism/sections/relationships-presenter.ts`

3. Add presenter tests:
- `packages/web/src/hud/panels/organism/sections/relationships-presenter.test.ts`

4. Export section from:
- `packages/web/src/hud/panels/organism/sections/index.ts`

5. Wiring completed:
- Extended `VisorHudPanelId` and panel registry in `panel-schema.ts`.
- Routed `relationships` in `VisorPanelBody.tsx`.
- Added layout test updates for availability and collapsed behavior.

## Acceptance Criteria For Wiring

- `relationships` appears only in `visor-organism` context.
- Panel appears in collapsed rail when universal panels are available.
- Panel body renders loading, empty, and populated states.
- No write actions are introduced.
- Existing panel layout tests continue passing with updated expected sets.
