# 018 — Public Read Path for Unauthenticated Users (Deferred Plan)

## Context

The current rendering and API flow is effectively authenticated-first:

- The web app routes through `AuthGate` before rendering `Platform`.
- Only `/health`, `/auth/*`, and `/platform/world-map` are public on the API.
- Organism read endpoints (`/organisms/:id`, `/states`, `/children`, `/parent`, `/vitality`, etc.) are mounted behind session auth.

This is coherent for Phase 1's immediate goal (founder and members tending organisms), but it blocks Depth 0 public encounter and lightweight Depth 1 understanding for visitors.

## Decision

Keep the authenticated experience as the active priority now. Do not implement guest access in the current sprint.

At the same time, lock a decision-complete plan so guest exploration can be implemented later without re-litigating architecture.

### Target Guest Depth

- Initial guest experience: **Depth 0 + light Depth 1**
- Guests can:
  - explore surfaced, public organisms in Space
  - open a limited visor with read-only context
- Guests cannot:
  - threshold organisms
  - append state
  - open proposals
  - integrate or decline proposals
  - compose or decompose
  - change visibility
  - access personal user views (`My Organisms`, user proposals, user relationships)

## Implementation Plan (Ready Later)

### 1) API: Add public read routes (no session required)

Create a separate public route group mounted outside `authMiddleware`:

- `GET /public/organisms/:id`
- `GET /public/organisms/:id/states`
- `GET /public/organisms/:id/children`
- `GET /public/organisms/:id/parent`
- `GET /public/organisms/:id/vitality`
- `GET /public/organisms/:id/visibility`
- `GET /public/maps/:id/surfaced` (optional helper if needed for map-only payloads)

Rules:

- Public routes only return data for organisms with effective visibility `public`.
- For non-public organisms, return `404` (not `403`) to avoid visibility leakage.
- Public routes are strictly read-only. No mutation endpoints under `/public`.

Design note:

- Keep access logic centralized. Add a guest-safe read check path in `packages/api/src/routes/access.ts` or a sibling helper that preserves the "single place for permission decisions" rule.

### 2) Kernel/Auth model: Introduce a guest caller path

Current `checkAccess` requires a `userId`. For guest reads, do not invent fake relationships.

Planned change:

- Extend access-control entry to accept `userId: UserId | null` for read checks.
- Semantics:
  - `null` user can perform `view` only when visibility is `public`.
  - all non-`view` actions with `null` are denied.
- Keep one canonical decision tree in `packages/kernel/src/visibility/access-control.ts`.

### 3) Web routing: Split guest and authenticated app shells

Replace hard auth gate root with mode-aware shell:

- `GuestApp` (default without session):
  - loads world map
  - renders Space
  - renders `GuestHud` / limited visor
  - shows auth CTA when user attempts gated actions
- `AuthenticatedApp` (existing behavior):
  - current `Platform` flow, unchanged by default

Session detection:

- Keep localStorage session token flow.
- If token exists and `/auth/me` succeeds, use authenticated shell.
- If absent/invalid, fall back to guest shell without showing auth error page.

### 4) Guest visor: limited universal layer

Guest visor includes read-only panels only:

- organism name + content type
- vitality
- composition (parent + children)
- short state history preview (latest N states)

Guest visor excludes:

- proposal list/action affordances
- governance controls that imply authority workflows
- all mutation actions

Recommended CTA placements:

- persistent button in HUD: `Sign up to threshold and tend`
- inline locked action buttons where authenticated actions would appear

### 5) Action gating contract in rendering

Introduce an explicit capability model in web state (example):

- `canViewPublic`
- `canThreshold`
- `canAppendState`
- `canOpenProposal`
- `canIntegrateProposal`
- `canCompose`
- `canChangeVisibility`

Guest capability profile:

- `canViewPublic = true`
- all mutation capabilities = `false`

Authenticated profile:

- computed from existing access and relationships as today

This prevents ad hoc UI conditionals and keeps gating predictable.

### 6) Endpoint and client strategy

Avoid overloading current authenticated client helpers.

Plan:

- Add public API client functions under `packages/web/src/api/public-organisms.ts`.
- Keep existing authenticated helpers in `packages/web/src/api/organisms.ts`.
- Hooks:
  - either add guest variants (`usePublicOrganism`, etc.)
  - or use a mode-aware hook wrapper that selects public/auth client by session mode

### 7) Testing plan

API tests:

- guest can read public organism via `/public/*`
- guest gets `404` for members/private organism via `/public/*`
- guest cannot call mutation endpoints (still `401` under authenticated routes)

Kernel tests:

- `checkAccess(null, organismId, 'view', ...)` allows public
- same call denies members/private
- `checkAccess(null, organismId, 'open-proposal', ...)` denies

Web tests:

- no session renders guest shell (not auth form as blocking gate)
- guest can explore map and open limited visor
- guest clicking threshold/propose/surface sees CTA, no mutation request sent
- valid session still renders full authenticated platform

### 8) Rollout sequence (future)

1. API public read routes + tests
2. kernel guest read semantics + tests
3. guest app shell + limited HUD
4. CTA and capability gating polish
5. regression pass on authenticated flows

## Acceptance Criteria (for future implementation)

- Unauthenticated visitor can explore surfaced public organisms and open a limited read-only visor.
- Unauthenticated visitor cannot perform threshold/proposal/composition/visibility mutations.
- Existing authenticated flows remain behaviorally unchanged.
- Access logic remains centralized and type-safe.
- Route responses do not leak existence of non-public organisms.

## Rationale

This approach preserves current Phase 1 focus while making the next step concrete and low-risk:

- no immediate scope expansion
- no ambiguity when implementation begins
- clean separation between public read path and authenticated mutation path
- full alignment with depth-level model: public encounter first, deeper participation after signup
