# 021 — Adaptive Visor Panel Taxonomy and Intent Matrix

## Context

The adaptive visor template-slot refactor established a strong rendering architecture, but panel behavior was still carrying legacy assumptions from pre-adaptive flows.

We needed a first-principles definition of:

- which panels exist
- each panel's single responsibility
- when panels are visible by context and mode
- how panel and widget lanes relate without ad hoc wiring

## Decision

Adaptive visor behavior is now driven by an explicit panel taxonomy and an intent matrix.

### 1) Panel taxonomy is explicit in registry

`packages/web/src/hud/visor/panel-schema.ts` is the source of truth for panel identity and purpose.

Each panel now declares a `purpose` string so panel responsibility is legible in one place.

### 2) Regulated proposal flow is split into two panels

For regulated organisms:

- `propose` panel: proposal creation
- `proposals` panel: integrate/decline and proposal history

This keeps creation and regulatory integration as distinct interactions.

### 3) Open-trunk replaces proposal panels with append panel

For open-trunk organisms:

- proposal panels are unavailable
- `append` panel is available for direct state append

### 4) Organism context starts collapsed with one entry point

In `visor-organism` context with no promoted panel:

- no main panel is rendered
- collapsed rail shows only `organism` (`Tend`)

When a universal panel is promoted, universal alternatives become available as collapsed alternatives.

### 5) Widget lane is explicit and separate from panels

Widgets remain a separate lane from panels.

- `compass` widget is map-only
- `vitality` is widget-only (not a panel), and appears only when a universal organism panel is open

### 6) Map panel set remains collapsed-first

In `map` context, collapsed panel set remains:

- `templates`
- `threshold`
- `mine`

## Intent Matrix

### Map context

- default: collapsed map panels + map widgets
- promote panel: open selected map panel in main slot

### Visor-organism context, regulated

- default: collapsed `Tend` only
- promote `Tend`: render organism; reveal universal collapsed alternatives
- promote `propose`: open proposal creation flow
- promote `proposals`: integrate/decline flow
- promote `history`: state history
- promote `governance`: policy visibility
- promote `composition`: composition work

### Visor-organism context, open-trunk

- default: collapsed `Tend` only
- universal alternatives include `append` instead of proposal panels

### Interior context

- collapsed `Tend current` action remains entry to visor-organism context

## Rationale

This preserves the adaptive architecture while clarifying the interface contract:

- panels have one responsibility each
- regulated vs open-trunk behavior is explicit, not implicit
- widgets are first-class and separate from panels
- reveal behavior is policy-driven, not host-level conditional sprawl

## Consequences

### Positive

- clearer panel boundaries and lower cognitive load
- proposal creation and integration are no longer conflated
- room for future widgets without panel taxonomy churn
- deterministic, testable panel reveal behavior

### Risk

- more panel IDs increases registry maintenance pressure
- if panel purpose strings and implementation drift, clarity degrades

## Status

Accepted and implemented.
