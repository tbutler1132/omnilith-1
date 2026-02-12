# 002 — Templates as Organisms and Pattern-Aware Rendering

## Context

The platform ships as a blank ecology. The founder composes the initial world. But useful patterns like "community" and "album project" need to be discoverable and reproducible without being hardcoded as infrastructure features.

The question: how do you nudge people toward foundational patterns while preserving the freedom to compose anything?

## Decision

Three mechanisms, none requiring kernel changes:

### 1. Living examples

The founder's own compositions serve as documentation. Visitors explore structure through the universal layer and learn by seeing.

### 2. Templates as organisms

A template is a content type whose state describes a composition recipe — what organisms to create, their content types, initial states, and how to wire them together. Instantiation reads the recipe and orchestrates existing kernel operations. No new kernel concern is needed.

Because templates are organisms, they get identity, state history, proposals, forking, and vitality for free. The founder's templates are compositional knowledge made shareable and evolvable.

### 3. Pattern-aware rendering

The rendering layer recognizes composition patterns and offers appropriate affordances. An organism containing governance + members + creative works gets community-appropriate rendering. An organism containing ordered audio organisms gets album affordances.

This is observation, not enforcement. The kernel has no concept of "community" or "album." The rendering layer sees what is inside and responds. Unanticipated compositions fall back to the universal layer.

## Rationale

- Templates validate the kernel architecture — if they required kernel changes, something would be wrong. They require zero.
- Pattern-aware rendering keeps the kernel clean while making common patterns feel natural and specific.
- The founder's nudge is compositional, not structural. Suggestions from the first composer, not constraints built into the physics.
- Someone can ignore all templates and compose from scratch. The platform supports it fully.
