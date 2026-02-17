# 022 — Adaptive Visor Layout Variants and Collapsed Overflow

## Context

Adaptive visor rendering is now driven by:

- panel taxonomy (`panel-schema.ts`)
- intent scoring (`intent-matrix.ts`)
- slot topology (`template-schema.ts`)
- deterministic layout policy (`panel-layout-policy.ts`)

As panel count grows, the collapsed rail can become crowded. At the same time, we want room for future layout variants (for example, a context that favors multiple secondary panels, or a main-menu style surface) without rewriting host-level logic.

## Decision

Adaptive visor layout evolution will follow these rules.

### 1) Collapsed overflow uses a panel-preserving index path

When collapsed candidates exceed visible rail capacity:

- show top-ranked collapsed chips up to capacity
- show one `More` chip
- `More` opens a dedicated index-style panel (panel ID to be introduced when implemented)

The overflow path must preserve explicit panel identity. It must not become an anonymous “misc” bucket.

### 2) Rail capacity is template-controlled, not host-controlled

Collapsed visibility capacity is a template/layout policy concern, not a host concern. The host should not decide ad hoc how many chips to show.

### 3) Panel priority remains centralized

Ranking for visible collapsed chips and overflow ordering continues to derive from:

- `panel-schema.ts` priority fields
- `intent-matrix.ts` context deltas

No ranking logic belongs in rendering hosts.

### 4) Layout variants are first-class

The adaptive architecture will support multiple layout variants per context class by extending template resolution (for example, context + variant key).

Examples:

- default organism layout (`secondary.maxPanels = 1`)
- analysis layout (`secondary.maxPanels = 3`)
- menu layout (main-focused with no secondary)

These are template-level choices; panel definitions and policy rules remain shared.

### 5) Panel/widget/action boundaries stay strict

- Panels are durable destinations with body semantics (loading/empty/error/interaction).
- Widgets are ambient signals.
- Actions are one-shot triggers.

Overflow and layout variants must not blur these categories.

## Rationale

This preserves the core modularity goal:

- panel identity remains stable
- orchestration remains deterministic and testable
- new layouts can be introduced as data/configuration, not host rewrites

It also aligns with the template-slot model from decision 019 and panel taxonomy model from decision 021.

## Consequences

### Positive

- Prevents collapsed-rail entropy as panel count increases.
- Enables new context-specific layouts with minimal architectural churn.
- Keeps future “main menu” or high-secondary layouts compatible with existing panel contracts.

### Risk

- Adds one more layer of template/configuration maintenance.
- Poorly chosen variant proliferation could fragment UX if not curated.

## Implementation Notes (Planned)

1. Add collapsed rail visible-capacity policy to template or panel layout policy input.
2. Introduce overflow index panel contract and renderer.
3. Extend template resolution to allow variant selection per context.
4. Add tests for:
   - overflow threshold behavior
   - overflow ordering stability
   - variant-specific secondary capacity (for example, `maxPanels = 3`)

## Status

Accepted as forward policy guidance; implementation staged.
