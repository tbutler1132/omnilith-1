# 024 — Organism Links in Text vs Structured References

## Context

A modeling question emerged: should cross-organism references live in a new generic "reference" content type, or should text content be able to link to organisms directly?

Current state:

- `composition-reference` already models structured arrangements of organism references (ordering/grouping semantics).
- `text` currently renders plain text/markdown but does not yet resolve organism-aware links.
- The kernel composition model should remain unchanged unless a new universal infrastructure concern is discovered.

The practical need is twofold:

1. Lightweight inline references in writing.
2. Structured, typed reference sets for curation and queryable workflows.

## Decision

Use two complementary patterns, with no kernel changes.

### 1) Inline organism references belong in `text` rendering

Extend the `text` content-type rendering path to support organism-aware links inside textual content.

- This solves narrative authoring needs (notes, essays, briefs, liner text).
- Link interpretation is a rendering concern, not a kernel concern.

### 2) Structured reference sets remain a dedicated content type concern

Keep `composition-reference` for explicit reference sets that need structure (ordering/grouping/arrangement intent).

- Do not collapse structured references into generic text links.
- Do not replace structured references with an untyped catch-all "reference" content type.

### 3) Promote a dedicated reference content type only when structure is required

If future reference workflows require typed roles and strong query semantics beyond `composition-reference`, introduce a dedicated typed content type for that purpose.

## Rationale

This preserves architectural clarity:

- kernel remains universal physics
- content types hold domain semantics
- rendering layer handles perception and navigation affordances

It also avoids over-generalization:

- text links stay lightweight and expressive
- structured references stay explicit and machine-legible

This follows the existing principle: new capability enters through content types and rendering composition, not kernel special-cases.

## Consequences

### Positive

- Writers can reference organisms directly in narrative content.
- Curators still have explicit structured-reference tools.
- No new kernel complexity is introduced.

### Risk

- Two reference mechanisms may confuse users unless UI copy is clear.
- Link syntax and resolution behavior must be consistent across render contexts.

## Status

Accepted.
