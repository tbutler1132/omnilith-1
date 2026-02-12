# Omnilith — Agent & Developer Guide

## What This Is

Omnilith is a platform where living creative work exists in relationship. It is an ecology, not a tool. The platform is not where you make things — it is where things that have achieved identity come to live, grow, find collaborators, compose into larger wholes, and be tended.

The system is built on a single primitive — the organism — and a thin infrastructure layer that makes organisms possible. Everything above the infrastructure is organisms composed of organisms.

**Source of truth hierarchy:**
1. `docs/FOUNDATION.md` — philosophical and strategic decisions
2. `docs/ORGANISM-MODEL.md` — the organism architecture and its rationale
3. `docs/DECISION-LOG.md` — reasoning trail for every major design decision
4. This file — practical guide for building

If conflicts arise between documents, the higher-numbered document wins. If something in this file conflicts with the model or foundation docs, those win.

---

## Core Concepts

Before touching code, understand these:

**The organism** is the single primitive. Everything on the platform — creative works, communities, governance policies, sensors, maps, economic models — is an organism. An organism has three properties: identity (persistent reference that endures through change), state (immutable snapshots with history), and composition (can contain and be contained by other organisms).

**The identity threshold** is a three-phase process: coherence is perceived (outside the system), stewardship is assumed (the threshold act — someone commits to tending something), identity is maintained (ongoing life through regulatory activity). The threshold is intentional but lightweight.

**The four categories** are the complete ontology. Everything in the system is exactly one of: infrastructure (the physics), organisms (living things), relationships (connective tissue between people and organisms), or rendering (the perceptual interface). Nothing spans categories.

**Emergence through composition.** Higher-order behavior arises from composing simple organisms together. Regulation is not built into the primitive — it emerges when policy organisms are composed inside a parent. Cybernetic behavior emerges when sensor, variable, prediction, and response policy organisms are composed together.

**The infrastructure** provides eight concerns and nothing more: organism identity, state management, composition, visibility and access, proposal evaluation, event emission, content type registration, and querying. All specificity lives in content types and composition, never in the infrastructure.

---

## Architecture

**Two layers.** The system is infrastructure + app. The infrastructure is the physics — universal operations on organisms, implemented as the kernel. The app is a specific configuration of organisms with specific content types and a specific rendering for the creative studio use case.

**Kernel architecture.** Three zones with strict dependency rules. The kernel is the center. It has zero external dependencies. Everything else depends on the kernel, never the reverse.

```
omnilith/
  packages/
    kernel/        — pure TypeScript, zero dependencies
                     organism primitive, eight infrastructure operations,
                     content type contract, port interfaces
    content-types/ — plugin implementations, imports kernel contracts
                     each type: schema, validator, evaluator
                     depends on kernel interfaces, nothing else
    api/           — HTTP adapter, imports kernel
                     implements storage ports (Postgres, object storage)
                     exposes operations as endpoints
    web/           — React + Vite, calls the API
                     content-type renderers and differs
                     universal layer, systems view
```

**Three zones:**
- **Kernel** — the eight infrastructure operations. Pure domain logic. Like an OS kernel that manages organisms the way an OS manages processes. Zero external dependencies.
- **Plugins** — content types. Like device drivers that teach the kernel how to handle specific kinds of data. Depend only on kernel contracts.
- **Adapters** — API, storage, rendering. Connect the kernel to the outside world. Implement outbound ports.

**Hard rules:**
- `packages/kernel/` imports nothing from any other package. Ever.
- `packages/content-types/` imports only contracts and interfaces from `kernel/`. Never concrete implementations.
- `packages/api/` imports from `kernel/`. Implements outbound ports (storage, event persistence).
- `packages/web/` imports content-type renderers and calls the API. Never touches the kernel directly.
- New capabilities enter through `content-types/`, never through kernel modifications.
- Never add special-case code to the kernel for a specific content type. If you feel the urge, ask whether it can be expressed as a composition of organisms instead.

**Stack:**
- Backend: TypeScript, standalone server (not Next.js API routes)
- Database: PostgreSQL, accessed via query builder (Drizzle or Kysely), not an ORM
- Content storage: object storage for binaries, Git for text-based content — routed by the `ContentStorage` port
- Frontend: React + Vite (no SSR, no Next.js)
- 3D: Three.js, dynamically imported, completely isolated

---

## Controlled Vocabulary

These terms have precise meanings. Use them exactly as written — in code, file names, variable names, comments, and conversation. No synonyms.

### The Primitive

| Term | Meaning | Never call it |
|------|---------|---------------|
| **organism** | The single primitive. A bounded evolving identity with state and composition. | artifact, item, document, resource, node, entity, object |
| **state** | An immutable snapshot of an organism's current manifestation. Self-describing — carries its own content type and payload. | version, revision, snapshot |
| **state history** | The ordered sequence of all states an organism has had. The visible trace of identity. | version history, changelog |
| **composition** | The containment relationship. An organism inside another organism. | nesting, hierarchy, tree |
| **boundary** | What a containing organism creates around its children. Containment is the Markov blanket. | scope, context, namespace |
| **vitality** | Observable property derived from recent activity — state changes, open proposals, contributor engagement. Determines rendering prominence. | activity score, engagement metric |
| **dormant** | An organism with sustained zero vitality. Not dead. Can be reawakened. | archived, inactive, deleted |

### Interactions

| Term | Meaning | Never call it |
|------|---------|---------------|
| **threshold** | The act of introducing something to the platform. Assuming stewardship. | upload, create, register |
| **proposal** | An offered new state for an organism. Subject to regulatory evaluation. | pull request, PR, merge request, edit |
| **integrate** | To accept a proposal. The organism's state advances. | merge, approve, accept |
| **decline** | To reject a proposal. The organism's state remains. | reject, deny, close |
| **tend** | The ongoing act of maintaining an organism's coherence. | manage, maintain, admin |
| **fork** | Copying an organism across boundaries. Independent with preserved lineage. | clone, duplicate |
| **surface** (verb) | To place an organism on a map with coordinates. A curatorial act. | publish, display, show |
| **open-trunk** | Configuration allowing direct state changes without proposals. | unprotected, public edit |

### System Structure

| Term | Meaning | Never call it |
|------|---------|---------------|
| **infrastructure** | The physics. Eight concerns that make organisms possible. Not organisms themselves. | platform, framework, backend |
| **content type** | A five-part contract: schema, renderer, differ, validator, optional evaluator. Lives on the state, not the organism. | file type, format, kind |
| **relationship** | Connective tissue between people and organisms. Membership, integration authority. Not organisms. | link, association |
| **rendering** | The perceptual interface. How organisms become visible and interactive. Not organisms. | UI, frontend, view |
| **universal layer** | The consistent set of affordances available on every organism regardless of content type. History, composition, governance, proposals. | detail view, inspector |
| **systems view** | The dedicated composition interface for structural work. Wiring organisms, designing governance, building cybernetic loops. | admin panel, settings, config |
| **content-type renderer** | The specific visual interface for a given content type. Audio player, text editor, map view, policy editor. | component, widget |

### People

| Term | Meaning | Never call it |
|------|---------|---------------|
| **user** | A person. Infrastructure, not an organism. The gardener, not the garden. | member (without node context), account |
| **founder** | The user with full authority over a community organism. | owner, admin |
| **member** | A user with membership in a community organism. | contributor, collaborator |
| **membership** | Relationship between a user and a community organism. Carries role. Not an organism. | — |
| **integrator** | A user assigned to hold the regulatory function for a specific organism. Not a role. | reviewer, maintainer, approver |
| **steward** | Anyone who has assumed responsibility for tending an organism. | owner, creator, manager |

### Communication

| Term | Meaning | Never call it |
|------|---------|---------------|
| **thread** | A conversation organism with open-trunk configuration. Append-only by default. | discussion, comment section, chat |
| **post** | A state append to a thread organism. | comment, reply, message |
| **conflict thread** | A thread linked to a specific disagreement, carrying structured information about positions, process, and outcome. | dispute, argument |
| **event** | An append-only record of something that happened. Emitted by infrastructure. | log, activity, notification |

### Spatial

| Term | Meaning | Never call it |
|------|---------|---------------|
| **map** | An organism with `spatial-map` content type. Curated, not automatic. | index, directory, listing |
| **personal organism** | An organism representing a user's creative practice, trajectory, and commitments. Not the user themselves. | profile, dashboard, home |

---

## Kernel Operations

The kernel implements exactly eight infrastructure concerns. These are the complete set of operations the system provides. Everything else is content types and composition.

1. **Organism identity** — create, reference, exist
2. **State management** — append immutable state, retrieve current, retrieve history
3. **Composition** — place inside, remove, query containment
4. **Visibility and access** — who can see, who can interact
5. **Proposal evaluation** — consult policy organisms, evaluate proposed state changes
6. **Event emission** — record every mutation, make observable
7. **Content type registration** — register schema, renderer, differ, validator, evaluator
8. **Querying** — cross-cutting retrieval across organisms, states, composition, relationships, vitality

---

## Content Type Contract

Every content type registers five handlers:

```typescript
interface ContentTypeContract {
  /** Unique identifier for this content type */
  typeId: string;

  /** Validates that a state payload is well-formed */
  validate(payload: unknown): ValidationResult;

  /** Renders the organism's current state for display */
  renderer: ComponentType<{ state: OrganismState }>;

  /** Shows the difference between two states */
  differ: ComponentType<{ before: OrganismState; after: OrganismState }>;

  /** Optional: evaluates proposals to parent organisms */
  evaluate?(proposal: Proposal, parentState: OrganismState): EvaluationResult;
}
```

Policy content types MUST have strict, fully typed schemas. Governance bugs are dangerous.
Creative content types SHOULD lean flexible. Creative work is unpredictable.

### Content Type Tiers

Build in this order. Each tier is new content type registrations — infrastructure never changes.

**Tier 1 — Creative Fundamentals:** Audio, Text/Markdown, Image, Spatial Map, Composition Reference. Minimum viable studio.

**Tier 2 — Governance:** Integration Policy, Membership Policy, Visibility Policy. Required when communities grow.

**Tier 3 — Awareness:** Sensor, Variable, Prediction, Response Policy. The cybernetic layer through composition.

**Tier 4 — Economic:** Paywall Policy, Revenue Distribution Policy. Required for financial viability.

---

## Coding Conventions

### One concept per file

Each file does one thing. The file tree should be scannable.

```
packages/kernel/src/
  organism/
    organism.ts                — the Organism entity
    organism-repository.ts     — the outbound port interface
    create-organism.ts         — use case
    append-state.ts            — use case
  composition/
    compose.ts                 — use case: place organism inside another
    decompose.ts               — use case: remove organism from parent
    query-children.ts          — use case
    query-parent.ts            — use case
  proposals/
    proposal.ts
    proposal-repository.ts
    open-proposal.ts
    evaluate-proposal.ts
    integrate-proposal.ts
    decline-proposal.ts
  content-types/
    content-type-registry.ts   — the registration port
    content-type-contract.ts   — the interface all types implement
  events/
    event.ts
    event-publisher.ts         — outbound port
  visibility/
    visibility.ts
    check-access.ts            — use case
  query/
    query-port.ts              — cross-cutting query interface
  ...
```

Use barrel files (`index.ts`) to re-export from each directory.

### Intent headers

Every module starts with a short comment block explaining **what this is and why it exists** — not how it works.

```typescript
/**
 * Proposal — an offered new state for an organism.
 *
 * Proposals are the central interaction between people and organisms.
 * When a proposal arrives, the infrastructure checks for policy organisms
 * inside the target organism and lets them evaluate. The result is
 * integration (state advances) or decline (state remains).
 *
 * Proposals work identically whether the source is an internal
 * contributor or a cross-boundary fork.
 */
```

### Naming

- File names: kebab-case, matching the domain term (`organism-repository.ts`, not `organismRepo.ts`)
- Interfaces for ports: descriptive name matching the domain (`OrganismRepository`, `ContentStorage`, `EventPublisher`, `ContentTypeRegistry`)
- Use cases: verb-noun matching the inbound port (`createOrganism`, `appendState`, `openProposal`, `composeOrganism`)
- No abbreviations of domain terms. `organism`, not `org`. `proposal`, not `prop`.

### Type everything at the boundaries

Ports — the interfaces between the kernel and adapters — must have precise types. No `any`, no loose objects. The type signature of a port is the spec for implementing its adapter. A well-typed port means an adapter can be written correctly without understanding kernel internals.

### Capability resolution in one place

All permission logic lives in a single, central module. One file. A lookup table or clear decision tree. Not scattered conditionals across handlers. An agent (or human) should understand the entire auth model by reading one file.

### Tests as specification

Tests read like domain statements, not implementation checks:

```typescript
// Good
it("a proposal to a regulated organism consults its policy organisms")
it("composing an organism inside another places it within the parent boundary")
it("forking copies the organism and all composed children independently")
it("an organism with zero vitality for 30 days is marked dormant")
it("open-trunk organisms accept direct state changes without proposals")

// Bad
it("should return 403")
it("should throw error")
it("works correctly")
```

Tests are ground truth. They document intended behavior. New behavior is added by analogy with existing tests.

---

## Key Domain Rules

These are constraints enforced in the kernel, not in adapters:

**Organism primitive:**
- An organism has exactly three properties: identity, state, composition
- States are immutable. Each state is self-describing (carries its own content type and payload)
- Content type lives on the state, not the organism. An organism's type can change across states.
- An organism can contain other organisms and be contained. Composition is the boundary mechanism.

**Proposals and regulation:**
- Regulation is not built into organisms. It emerges from composing policy organisms inside a parent.
- An organism with no policy children is open — state changes are unrestricted.
- An organism with policy children has its proposals evaluated by those policies.
- The proposal mechanism is identical regardless of origin (internal or cross-boundary fork).
- Open-trunk organisms bypass proposal evaluation entirely. Any authorized user can append state directly.

**Composition:**
- Composition is always local to a boundary. Cross-boundary inclusion requires forking first.
- A fork copies the organism and all composed children. The fork is fully independent. Lineage is preserved.
- The containing organism's state includes the arrangement of its children (ordering, relationships).

**Categories:**
- Users are infrastructure, not organisms.
- Membership is a relationship, not an organism.
- Threads are organisms with open-trunk configuration.
- Maps are organisms with spatial-map content type. Surfacing means editing the map organism.
- Everything that crosses the threshold is an organism. Everything else is infrastructure, a relationship, or rendering.

---

## Phase 1 Scope

We are building Phase 1. Nothing else. If the urge to add features arises before Phase 1 feels solid, the answer is no.

**Build stages:**

1. **Kernel** — the organism primitive, state management, composition engine, proposal evaluation loop, event emission, visibility, content type registry, query layer. Tests against in-memory adapters. This is the physics. Get it right.

2. **Tier 1 Content Types** — Audio, Text/Markdown, Image, Spatial Map, Composition Reference. Plus the simplest Integration Policy from Tier 2 (single integrator). Register schemas, renderers, differs, validators.

3. **API** — HTTP endpoints exposing infrastructure operations. Session-based auth. Thin adapter.

4. **Rendering — Read Path** — arriving, navigating, exploring. Content-type-specific renderers. The universal layer on every organism. The map. No editing UI yet.

5. **Rendering — Write Path** — proposing, integrating, declining. Composing organisms. The systems view for structural work.

**Exit criteria:**
- A visitor can experience the creative studio and understand what this place is
- The founder can introduce organisms, compose them, and tend them entirely inside Omnilith
- Organisms compose correctly — children within parents, boundaries enforced
- The proposal-integration loop works end to end, including policy organism evaluation
- The universal layer is consistent on every organism
- The map feels intentional and curated
- Content-type renderers make each organism feel like what it is (a song feels like a song)
- The systems view allows structural composition work

---

## Rendering Architecture

Three levels of composition interface:

1. **Implicit composition** — user adds a song to an album, invites a member. The composition is real but the interface speaks in specific terms. No organism vocabulary exposed.

2. **Universal layer** — available on every organism via consistent gesture. Shows state history, composition (what's inside, what it's inside of), governance (policy organisms), vitality. Informational, consistent, always the same shape.

3. **Systems view** — dedicated workspace for structural composition. All children visible as organisms with connections drawn between them. Where cybernetic loops are wired. The hood of the car.

**Content-type renderers** are loaded dynamically from the content type registry. The rendering layer asks: "what content type is this organism's current state?" and loads the appropriate renderer. Unknown content types get a generic fallback.

**Vitality** informs rendering prominence. High-vitality organisms are foregrounded. Dormant organisms are available but quiet. The query layer provides vitality data. The rendering layer uses it.

---

## Decision Log

Record architectural and implementation decisions in `docs/decisions/` as they arise. Format: `NNN-title.md` with context, decision, and rationale. This prevents re-litigating settled questions.

Major decisions and their reasoning are also captured in `docs/DECISION-LOG.md`.

---

## Working With This Codebase

- Read `docs/FOUNDATION.md` for philosophy and strategy
- Read `docs/ORGANISM-MODEL.md` for the organism architecture
- Read `docs/DECISION-LOG.md` to understand why decisions were made
- Use the controlled vocabulary exactly — never introduce synonyms
- Stay within the three-zone boundaries — kernel has no external imports
- The kernel has eight concerns. Do not add a ninth.
- New capabilities come from new content types, not kernel modifications
- One concept per file, intent headers on every module
- Tests are specs — write them as domain statements
- Don't build beyond Phase 1 scope
- When in doubt, the answer is in the organism model or foundation docs
