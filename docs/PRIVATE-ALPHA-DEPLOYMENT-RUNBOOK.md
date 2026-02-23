# Private Alpha Deployment Runbook

Updated: February 23, 2026
Audience: Maintainers
Scope: Private alpha deployment with staging-first rollout

## Goal

Deploy Omnilith for private alpha using:

- Web: Vercel
- API: Render Web Service
- Database: Render Postgres (separate staging and production)

This runbook is aligned to the current codebase behavior:

- API health endpoint: `/health`
- Web client calls `/api/*`
- Startup bootstrap seed policy is environment-gated
- `db:reset` is local-only guarded

## Topology

1. `packages/web` on Vercel:
   - `web-staging` project
   - `web-production` project
2. `packages/api` on Render:
   - `api-staging` web service
   - `api-production` web service
3. Postgres on Render:
   - `omnilith-staging-db`
   - `omnilith-production-db`

## Render API Setup

Create one Render Web Service for staging first.

- Build Command:
  - `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @omnilith/api... build`
- Pre-Deploy Command:
  - `pnpm --filter @omnilith/api db:migrate`
- Start Command:
  - `node packages/api/dist/index.js`
- Health Check Path:
  - `/health`

If pre-deploy commands are unavailable on your plan, run migrations manually before first traffic.

## API Environment Variables

### Staging API

- `DATABASE_URL=<render-postgres-internal-url>`
- `OMNILITH_RUNTIME_ENV=staging`
- `OMNILITH_ENABLE_BOOTSTRAP_SEED=true`
- `OMNILITH_SEED_PROFILE=v1-demo`
- `NODE_ENV=production`

### Production API

- `DATABASE_URL=<render-postgres-internal-url>`
- `OMNILITH_RUNTIME_ENV=production`
- `OMNILITH_ENABLE_BOOTSTRAP_SEED=false`
- `NODE_ENV=production`

Optional:

- `SUBSTACK_SUBSCRIBE_URL=...`
- GitHub automation env vars only if that automation is enabled

## Vercel Web Setup

Create one Vercel project for staging and one for production.

- Install Command:
  - `pnpm install --frozen-lockfile`
- Build Command:
  - `pnpm --filter @omnilith/web build`
- Output Directory:
  - `packages/web/dist`

Set web env vars (both projects):

- `VITE_AUTH_ENABLED=true`
- `VITE_GUEST_ACCESS_STRATEGY=interest`

Configure rewrite rule in each project:

- Source: `/api/:path*`
- Destination (staging): `https://<staging-api>.onrender.com/:path*`
- Destination (production): `https://<production-api>.onrender.com/:path*`

## Rollout Order

1. Create Render staging Postgres.
2. Deploy Render staging API.
3. Verify API health:
   - `GET https://<staging-api>.onrender.com/health`
4. Deploy Vercel staging web with `/api` rewrite to staging API.
5. Use staging for private alpha tending.
6. Repeat for production after hardening checks.

## Optional Background Jobs

If running regulator and GitHub dispatch automation, add Render cron jobs:

- `pnpm --filter @omnilith/api regulator:run`
- `pnpm --filter @omnilith/api github:dispatch-issues`

Suggested interval:

- `*/5 * * * *`

## Safety Notes

- Startup seed in production is blocked by runtime policy.
- `db:reset` is blocked unless `OMNILITH_RUNTIME_ENV=local`.
- Staging startup seeding is idempotent and should not drop schema/data.

