# Omnilith

A platform where creative work comes to live. Not to be stored, not to be shared, not to be optimized — to live.

You bring something you've made, give it an identity, and tend it over time. It grows, changes, finds collaborators, and composes into larger things.

## What this is

Omnilith is built on a single primitive — the **organism**. Everything on the platform (creative works, communities, governance policies, maps) is an organism. An organism has three properties:

- **Identity** — a persistent reference that endures through change
- **State** — immutable snapshots with history
- **Composition** — can contain and be contained by other organisms

Complexity emerges from composing simple organisms together, not from adding features. A community is an organism containing creative works, governance rules, and member relationships. An album is an organism containing songs in a specific order. Governance is organisms all the way down.

There are no engagement metrics, no algorithmic feeds, no follower counts. The space is curated by the people who inhabit it.

Read the full vision in [docs/WHAT-IS-THIS.md](docs/WHAT-IS-THIS.md) and the philosophical foundation in [docs/FOUNDATION.md](docs/FOUNDATION.md).

## Architecture

Two layers: **infrastructure** (the physics) and **app** (a specific configuration of organisms).

```
packages/
  kernel/          Pure TypeScript, zero dependencies.
                   The organism primitive and eight infrastructure operations.

  content-types/   Plugin implementations. Each type: schema, validator, evaluator.
                   Depends only on kernel contracts.

  api/             HTTP adapter (Hono). Implements storage ports (PostgreSQL via Drizzle).
                   Exposes operations as endpoints.

  web/             React + Vite. Content-type renderers, universal layer, systems view.
```

Three strict dependency zones:
- **Kernel** imports nothing from any other package. Ever.
- **Content types** import only contracts from kernel.
- **Adapters** (api, web) implement outbound ports and connect the kernel to the outside world.

See [docs/ORGANISM-MODEL.md](docs/ORGANISM-MODEL.md) for the full architecture and [docs/DECISION-LOG.md](docs/DECISION-LOG.md) for why decisions were made.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- [PostgreSQL](https://www.postgresql.org/) >= 15 (for running the API)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/omnilith.git
cd omnilith

# Install dependencies
pnpm install

# Install local git hooks (one time per clone)
pnpm run hooks:install

# Run the full check suite (build + lint + test)
pnpm run check
```

### Development

```bash
# Start the API and web dev servers
pnpm run dev

# Run tests in watch mode (in a specific package)
pnpm --filter @omnilith/kernel test:watch

# Format code
pnpm run format

# Run tests with coverage
pnpm run test:coverage
```

### Database setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your PostgreSQL connection string, then:
pnpm --filter @omnilith/api db:migrate

# Reset + reseed dev data at any time
pnpm run db:reset
```

For branch protection, CI, and local workflow guardrails, see [docs/DEVELOPMENT-GUARDRAILS.md](docs/DEVELOPMENT-GUARDRAILS.md).

## Project structure

| Path | Purpose |
|------|---------|
| `docs/FOUNDATION.md` | Philosophical and strategic decisions |
| `docs/ORGANISM-MODEL.md` | The organism architecture and rationale |
| `docs/DECISION-LOG.md` | Reasoning trail for every major design decision |
| `docs/decisions/` | Individual architectural decision records |
| `CLAUDE.md` | Agent and developer guide, controlled vocabulary |
| `CONTRIBUTING.md` | How to contribute |

## Contributing model

Omnilith uses a dual-lane contribution model:

- Human-authored code can be submitted via normal pull requests.
- AI-authored implementation work should be proposed through `.github/issue-proposals/` (one JSON file per proposal).

Accepted proposal entries are synchronized into GitHub issues automatically after merge to `main`.
See [CONTRIBUTING.md](CONTRIBUTING.md) for required proposal fields and workflow details.
For agent webhook setup, see [docs/AGENT-WEBHOOK-RECEIVER.md](docs/AGENT-WEBHOOK-RECEIVER.md).

## Tech stack

- **Language:** TypeScript (strict mode)
- **Backend:** [Hono](https://hono.dev/) (HTTP), [Drizzle](https://orm.drizzle.team/) (query builder), PostgreSQL
- **Frontend:** React + [Vite](https://vite.dev/)
- **Testing:** [Vitest](https://vitest.dev/)
- **Linting/Formatting:** [Biome](https://biomejs.dev/)
- **Monorepo:** pnpm workspaces

## Status

Phase 1 — building the foundation. The kernel, content types, and API are implemented with 119+ passing tests. The web rendering layer is in progress.

## License

[MIT](LICENSE)
