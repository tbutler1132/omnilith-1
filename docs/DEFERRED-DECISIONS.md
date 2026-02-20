# Deferred Decisions

Status: Active working register  
Updated: February 20, 2026  
Audience: Founders, maintainers, agents  
Canonicality: Pre-decision queue (defers to Foundation, Organism Model, Decision Log)

## Purpose

Use this register for questions that are important but not yet ready for a final decision.

When a question is resolved:

1. Write a formal decision record in `docs/decisions/NNN-title.md`.
2. Add or update the summary in `docs/DECISION-LOG.md`.
3. Mark the deferred item as resolved and link the decision record.

## Entry Format

Use this shape for each item:

- `id`: short stable key
- `title`: the unresolved architectural question
- `status`: `open` | `in-review` | `resolved` | `dropped`
- `opened`: date first captured
- `owner`: current decision owner
- `context`: why this matters
- `options`: realistic paths being considered
- `decision-trigger`: what evidence or milestone should force a decision
- `target-window`: expected decision timing
- `links`: related docs, PRs, issues, or prototypes

## Register

### DD-001 — Spatial map as boundary vs rendering

- `id`: `DD-001`
- `title`: Should `spatial-map` organisms be true composition boundaries or remain curation surfaces that reference/surface organisms?
- `status`: `open`
- `opened`: `2026-02-20`
- `owner`: `founder`
- `context`: We want coherent location semantics. If being "in a place" should imply governance (similar to physical jurisdiction), composition boundaries may need to represent place directly.
- `options`:
  - Keep map as rendering: use separate boundary organisms (for example, place/jurisdiction) for policy and containment.
  - Make map the boundary: children composed into the map and governed by map-contained policies.
  - Hybrid: one canonical containing boundary, map renders that boundary and can still support alternate cartographies.
- `decision-trigger`: First implementation of location-aware governance in write-path flows.
- `target-window`: Before building map-driven governance UX in systems view.
- `links`:
  - `docs/ORGANISM-MODEL.md`
  - `docs/DECISION-LOG.md`
  - `docs/decisions/031-canonical-natural-space-with-optional-digital-visor-map-overlay.md`
  - `docs/decisions/032-digital-map-staged-delivery-panel-first-overlay-later.md`
