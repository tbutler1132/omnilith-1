# Development Guardrails

Use this checklist to keep local development reversible and keep `main` stable.

## Local Setup

1. Install dependencies: `pnpm install`
2. Install git hooks once per clone: `pnpm run hooks:install`
3. Run migrations when needed: `pnpm run db:migrate`
4. Reset and reseed local data at any time: `pnpm run db:reset`

`db:reset` is intentionally destructive and dev-only. It:
- Drops and recreates the `public` schema
- Reapplies all migrations
- Reseeds the world map and development organisms

Safety checks in `db:reset`:
- Requires `OMNILITH_ALLOW_DB_RESET=true` (set by the root script)
- Refuses to run when `NODE_ENV=production`
- Refuses non-local database hosts

## GitHub Setup

After creating the remote repository:

1. Push the current branch to GitHub.
2. In repository settings, enable branch protection for `main`.
3. Require pull requests before merge.
4. Require status checks to pass before merge.
5. Select the `Check` workflow status check.
6. Restrict direct pushes to `main`.

## Daily Flow

1. Create a short-lived branch: `feat/...` or `fix/...`
2. Make changes and commit locally (pre-commit runs lint)
3. Push branch (pre-push runs full `pnpm run check`)
4. Open a pull request using the template
5. Merge only when CI is green
