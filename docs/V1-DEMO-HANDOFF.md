# V1 Demo Handoff

Status date: February 19, 2026
Owner context: Tim + Codex session handoff

## Purpose

This document captures the implementation context for the current V1 demo direction so a later session can resume quickly without re-discovery.

## Canonical decisions

- Demo-first guest encounter is the canonical V1 path.
- Auth is hidden by configuration in demo mode, not removed from architecture.
- Guest write actions are gated through interest capture.
- Demo and auth development run in parallel profiles (ports + databases + seed profiles).
- Hero's Journey uses a bounded bespoke renderer/content type path for V1.
- Organism contribution credit is first-class in API + panel rendering.

Primary records:
- `docs/decisions/026-demo-first-canonical-guest-flow-and-contributions.md`
- `docs/DECISION-LOG.md` (Move 36)

## Runtime profiles and commands

Use these from repo root:

- Demo profile: `pnpm run dev:demo`
- Auth profile: `pnpm run dev:auth`
- Reset demo DB: `pnpm run db:reset:demo`
- Reset auth DB: `pnpm run db:reset:auth`
- Full verification: `pnpm run check`

Current profile wiring is in:
- `package.json`
- `.env.example`
- `packages/web/src/config/runtime-flags.ts`

## Known local DB gotcha

Observed repeatedly during demo reset:
- `db:reset:demo` can fail because `drizzle.__drizzle_migrations` already exists after dropping/recreating `public`.
- Symptom: `relation "platform_config" does not exist` during reset flow.

Workaround used successfully in this session:

```sh
psql postgres://localhost:5432/omnilith_demo -c "DROP SCHEMA IF EXISTS drizzle CASCADE;"
pnpm run db:reset:demo
```

## Hero's Journey modeling (clean, no hardcoded stage-song map in renderer)

Model implemented:

- Parent organism: `hero-journey-scene`
- Children under the scene boundary:
  - `hero-journey-stage` organisms (narrative structure)
  - `song` organisms (candidate pool / composed songs)
- For each stage organism:
  - compose one `composition-reference` child
  - its `entries` point to candidate song organism IDs

This gives natural candidate mapping by composition/reference, not renderer hardcoding.

## Hero's Journey implementation map

Content types:
- `packages/content-types/src/hero-journey-stage/schema.ts`
- `packages/content-types/src/hero-journey-stage/validator.ts`
- `packages/content-types/src/hero-journey-stage/contract.ts`
- `packages/content-types/src/hero-journey-stage/index.ts`
- Registered in `packages/content-types/src/index.ts`

Hero scene payload update:
- `packages/content-types/src/hero-journey-scene/schema.ts`
- `packages/content-types/src/hero-journey-scene/validator.ts`

Seed helper and blueprint:
- `packages/api/src/seed-helpers/hero-journey.ts`
- `packages/api/src/seed-blueprints/hero-journey-v1-demo.json`
- `packages/api/src/seed-blueprints/load-hero-journey-v1-demo-blueprint.ts`
- `packages/api/src/seed-v1-demo.ts` (loads blueprint + seeds scene via helper)

Renderer behavior:
- `packages/web/src/renderers/hero-journey-scene.tsx`
- `packages/web/src/renderers/hero-journey-stage.tsx`
- `packages/web/src/hooks/use-organism.ts` (`useChildrenByParentIds`)
- `packages/web/src/renderers/index.ts` (registers stage renderer)
- `packages/web/src/styles.css` (stage + candidate UI styles)

Validation coverage:
- `packages/content-types/src/__tests__/validators.test.ts`

## Media playback and R2 integration

Rule now:
- If `fileReference` is absolute `http(s)`, web uses it directly.
- Otherwise web routes through `/api/public/files/...` for local `dev/...` assets.

Files:
- `packages/web/src/api/files.ts`
- `packages/web/src/api/files.test.ts`
- `packages/api/src/routes/public-files.ts` (local `dev/` only)

## Current demo blueprint media state

`packages/api/src/seed-blueprints/hero-journey-v1-demo.json` currently points mixes to real R2 objects:

- `all-the-things-you-love`
- `between-this-world-and-the-next`
- `stars`

R2 path pattern used:
- `https://pub-6534b0d9c04249c28e7c62bff1eb1d16.r2.dev/artifacts/songs/<song-slug>/trunk/audio/mix/<filename>.wav`

Optional local source used to verify slugs/files in this session:
- `/Users/timbutler/Projects/numinous-systems/nodes/org/artifacts/songs`

## Contributions panel status

The Contributions panel is live and intended to sit with organism universal panels (including near Proposals/Composition in the deck).

Read model and routes:
- `packages/api/src/adapters/pg-query-port.ts` (`getOrganismContributions`)
- `packages/api/src/routes/organisms.ts` (`GET /organisms/:id/contributions`)
- `packages/api/src/routes/public-organisms.ts` (`GET /public/organisms/:id/contributions`)

Web usage:
- `packages/web/src/api/organisms.ts` (`fetchContributions`)
- `packages/web/src/hooks/use-organism.ts` (`useContributions`)
- `packages/web/src/hud/panels/organism/sections/ContributionsSection.tsx`
- `packages/web/src/hud/panels/core/panel-schema.ts`
- `packages/web/src/hud/panels/core/panel-body-registry.tsx`

## Seed outcomes from this session

Latest successful demo reset output in this session:

- Hero's Journey organism: `1b43f5ea-2c90-4655-9468-aa0bc1f21141`
- Weekly Updates organism: `21a7763f-a70a-4708-b0e3-c5c4202197a1`
- World map organism: `de223600-3ce9-48cf-9b7d-e14a737dd57e`

These IDs are ephemeral and change on reset; included only as execution confirmation.

## Practical resume checklist

When resuming later:

1. Run `pnpm run db:reset:demo` (if it fails, drop `drizzle` schema then rerun).
2. Run `pnpm run dev:demo`.
3. Open Hero's Journey and verify:
   - stage cards render,
   - candidate songs render from stage composition-reference,
   - audio playback works from R2 URLs.
4. If expanding songs/stages, edit only:
   - `packages/api/src/seed-blueprints/hero-journey-v1-demo.json`
5. Re-run:
   - `pnpm run db:reset:demo`
   - `pnpm run check`

