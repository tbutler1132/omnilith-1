# 020 — Public Read Path Enabled for Unauthenticated Visitors

## Context

Decision 018 deferred public read access so Phase 1 could prioritize authenticated tending workflows.

That deferment now blocks the intended encounter for Omnilith:

- visitors should be able to experience the place before account creation
- the medium should communicate itself through direct use
- authentication should gate writing, not basic understanding

The target for this phase is clear:

- unauthenticated visitors can read public organisms
- unauthenticated visitors cannot perform write actions

## Decision

Enable public read access now.

### 1) Public API read routes are active

A dedicated read-only route group is exposed under `/public/organisms/*`.

These routes support organism exploration without session auth:

- organism + current state
- state history
- composition (parent/children)
- vitality
- visibility
- proposals (read-only)
- events
- relationships

### 2) Guest access semantics are explicit in kernel access control

`checkAccess` now accepts a guest caller path (`userId = null`) with strict behavior:

- guest caller may `view` only when effective visibility is `public`
- guest caller is denied for every non-`view` action

This preserves one canonical access decision tree while supporting guest reads.

### 3) Non-public organisms do not leak through public routes

Public route access denials resolve as `404` (not `403`) for non-public organisms.

### 4) Rendering is mode-aware

The web app now supports both modes from one shell:

- guest read mode (default when no valid session)
- authenticated tending mode (when session exists)

Read operations automatically use `/public/*` when no session exists.

Write controls remain authenticated-only.

## Rationale

This aligns the product experience with the platform philosophy:

- encounter first, participation next
- public meaning before account ceremony
- clear separation of read freedom and write responsibility

## Consequences

### Positive

- Visitors can understand Omnilith by exploring surfaced public organisms directly.
- Founder demos no longer require pre-auth setup for the read path.
- Authenticated mutation flows remain intact.

### Tradeoff

- Rendering now carries explicit guest/auth gating logic for write affordances.
- Public and authenticated read clients must remain behaviorally aligned.

## Status

Accepted and implemented.
