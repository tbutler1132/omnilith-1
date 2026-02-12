# 006 — Build Plan: General-Purpose Composition Platform (Space + Visor)

## Context

The project has shifted from "build a creative studio app on top of universal infrastructure" to "build the general-purpose organism composition platform; the founder dogfoods it by composing a creative studio." The kernel (69 tests), content types (31 tests, 10 types), and API (19 tests) are complete. The web package has a partial shell (auth, organism detail view, text renderer, docs). The web needs to be rebuilt around the Space + Device (Visor) paradigm defined in design sessions (see decisions 003-005).

**Goal:** A working composition platform where the founder can threshold organisms, compose them, surface them on maps, and navigate the spatial world — then use that platform to compose the initial creative studio.

---

## Phase A: Backend Prerequisites

Small additions to support the new UX. No kernel architecture changes.

### A.1 — Template content type
New content type in `packages/content-types/src/template/`
- Schema: `{ name, description, recipe: Array<{ ref, contentTypeId, initialPayload, openTrunk?, composeInto?, position? }> }`
- Validator: checks recipe has valid structure, refs are unique, composeInto refs exist
- No evaluator (templates don't participate in proposal evaluation)
- Add to `allContentTypes` in `packages/content-types/src/index.ts`
- Tests in `packages/content-types/src/__tests__/template.test.ts`

### A.2 — Template instantiation endpoint
New route file: `packages/api/src/routes/templates.ts`
- `POST /templates/:id/instantiate` — reads template state, executes recipe by calling `createOrganism` + `composeOrganism` in sequence, returns created organisms
- Mount in `packages/api/src/server.ts`

### A.3 — Personal organism + home page organism at signup
Modify `packages/api/src/routes/auth.ts` (line 42-61)
- Change personal organism from content type `text` to `spatial-map`
- Payload: `{ entries: [], width: 2000, height: 2000 }`
- Also create a home page organism (starter content type, e.g. `text` with a minimal bio template)
- Personal organism = private workspace (regulatory). Home page organism = public presence (expressive).
- Onboarding flow guides user to surface their home page onto the commons

### A.4 — World map seeding
New file: `packages/api/src/seed.ts`
- On startup, create world map organism if not exists (content type `spatial-map`, open-trunk initially)
- Store world map ID in a config table or env var
- Modify `packages/api/src/index.ts` to call seed on startup
- Add `GET /platform/world-map` endpoint returning the world map ID

### A.5 — User proposals query
Modify `packages/kernel/src/query/query-port.ts` — add `findProposalsByUser(userId)` method
- Returns proposals the user authored + proposals on organisms they steward
- Update in-memory adapter: `packages/kernel/src/testing/in-memory-query-port.ts`
- Update Postgres adapter: `packages/api/src/adapters/pg-query-port.ts`
- Add `GET /users/me/proposals` endpoint in `packages/api/src/routes/users.ts`

---

## Phase B: Restructure Web Shell

Replace page-based routing with Space + Visor layout. This clears the path for everything else.

### B.1 — PlatformContext
New file: `packages/web/src/platform/PlatformContext.tsx`
- Shared state: `userId`, `personalOrganismId`, `worldMapId`, `currentMapId`, `focusedOrganismId`, `visorOpen`, `visorSection`
- Actions: `setFocusedOrganism`, `setCurrentMap`, `enterMap`, `exitMap`, `openVisor`, `closeVisor`
- Navigation stack for zoom-as-composition-depth

### B.2 — New App.tsx structure
Modify `packages/web/src/App.tsx`:
```
App → BrowserRouter
  /docs/* → DocsLayout (unchanged)
  /* → AuthGate → Platform
    Platform → PlatformProvider
      Space (full viewport, always rendered)
      Visor (overlay)
```
- URL model: `/?map=<id>&x=0&y=0&z=1` via search params
- Retire `Landing.tsx` (replaced by Space) and `OrganismView.tsx` (functionality moves to Visor Here section)

### B.3 — API client additions
Modify `packages/web/src/api/organisms.ts`:
- Add `fetchWorldMap()`, `instantiateTemplate(id)`, `fetchUserProposals()`, `appendState(id, contentTypeId, payload)`, `openProposal(organismId, contentTypeId, payload)`

### Reused without changes
- `api/client.ts`, `api/auth.ts`, `auth/AuthGate.tsx`, `hooks/use-organism.ts`
- `organisms/Vitality.tsx`, `organisms/StateHistory.tsx`, `organisms/Governance.tsx`
- `organisms/ThresholdForm.tsx`, `organisms/OrganismPicker.tsx`
- `docs/*` (entire docs section)

---

## Phase C: The Space (2D Zoomable Canvas)

New directory: `packages/web/src/space/`

### Technical approach: CSS transforms
- Container div with `transform: translate(x, y) scale(zoom)` — hardware accelerated, no new deps
- React components for each organism (full React reuse, content-type renderers work directly)
- Visibility culling: only render organisms within viewport bounds
- Sufficient for Phase 1 scale (< 100 organisms per map)

### Components
| File | Purpose |
|------|---------|
| `Space.tsx` | Root — renders SpaceViewport for current map |
| `SpaceViewport.tsx` | CSS transform container, pointer events for pan/zoom |
| `SpaceLayer.tsx` | Renders spatial-map entries as positioned SpaceOrganism components |
| `SpaceOrganism.tsx` | Single organism at map position, delegates to content-type renderer (passes zoom level), click to focus |
| `SpaceTransition.tsx` | Animated transition entering/leaving sub-maps |
| `use-viewport.ts` | Hook: viewport state `{ x, y, zoom }`, pan/zoom handlers |
| `use-spatial-map.ts` | Hook: loads spatial-map organism state |
| `use-navigation.ts` | Hook: map stack for zoom-as-composition-depth |
| `viewport-math.ts` | Pure functions: coordinate conversion, bounds, culling |

### Key interactions
- **Pan:** pointer drag on canvas
- **Zoom:** mouse wheel / pinch
- **Focus organism:** click → sets `focusedOrganismId` in PlatformContext, opens Visor Here section
- **Enter sub-map:** double-click spatial-map organism → push to navigation stack, animated transition
- **Exit sub-map:** zoom out past minimum → pop stack, transition back to parent

### Vitality rendering
- Fetch vitality for visible organisms
- CSS classes: high (vivid, bright), medium (normal), low (faded), dormant (greyscale)

---

## Phase D: The Visor (Device Interface)

New directory: `packages/web/src/visor/`

### Two states
**Ambient HUD** — always visible, fixed top edge:
- Containment breadcrumb from navigation stack ("World > Community > Album")
- Tending indicator: count of open proposals on user's organisms
- Focused organism identity (name/type)

**Full Visor** — overlay panel, ~70% viewport height from bottom:
- Trigger: keyboard shortcut (backtick or Tab), click HUD, or button
- Space dimmed behind with `backdrop-filter: blur(8px)`
- Dismiss: same trigger, Escape, or click dimmed space
- CSS transition: `translateY(100%)` → `translateY(0)`

### Sections
| Section | Content | Data source |
|---------|---------|-------------|
| **Here** | Universal layer for focused organism. Tending interface: Vitality, Composition, Proposals, StateHistory, Governance. No content-type renderer — you experience the organism in the space, you tend it in the visor. | `useOrganism(focusedId)` |
| **Mine** | My organisms, outgoing proposals, incoming proposals (on organisms I steward), ideas organisms | `findOrganismsByUser`, `findProposalsByUser` |
| **Compose** | ThresholdForm (reused), template browser, systems view entry. Surface button when viewing an organism | Existing threshold flow + template API |
| **Discover** | Browse templates with recipe previews. Browse communities (spatial-map organisms on world map) | `fetchOrganisms({ contentTypeId: 'template' })` |

### Surfacing flow (from Compose or Here section)
1. Click "Surface" on an organism
2. SurfaceForm: select target map, click-to-place on mini preview
3. Submit: append new state to map organism (add entry with coordinates)
4. Space refreshes, organism appears

### Systems view (Phase 1 minimal)
`visor/systems-view/SystemsView.tsx` — shows organism's children as a simple node layout. Informational, not full editing. Enough to understand composition structure.

---

## Phase E: Content-Type Renderers

Modify `packages/web/src/renderers/registry.ts` — change RendererProps to pass `zoom: number` and `focused: boolean` instead of a mode enum. Each renderer decides its own zoom breakpoints. (See decision 007.)

**Space = experiential** (view/experience organisms), **Visor = operational** (tend/compose organisms). Renderers in the space adapt continuously to zoom level — not a binary compact/full toggle.

### New renderers in `packages/web/src/renderers/`
| Renderer | Zoomed out | Zoomed in close |
|----------|------------|-----------------|
| `audio.tsx` | Icon + title | Waveform + playable HTML5 `<audio>` |
| `image.tsx` | Thumbnail | Full image fills area |
| `spatial-map.tsx` | Mini-map (dots at positions) | Not used (the Space IS the renderer) |
| `thread.tsx` | Title + post count | Readable post list |
| `integration-policy.tsx` | "Policy" badge | Policy details |
| `composition-reference.tsx` | "Collection: N items" | Ordered list |
| `template.tsx` | Name + step count | Recipe visualization |

### Modify existing
- `text.tsx` — zoom-responsive: title at low zoom, first paragraph at mid, full readable text at high
- `fallback.tsx` — zoom-responsive: content type badge at low zoom, raw payload preview at high
- `index.ts` — register all new renderers

### Build priority
1. `text.tsx` (most common initially, good test of zoom-responsive pattern)
2. `image.tsx` (high visual impact in space, natural zoom behavior)
3. `audio.tsx` (founder's creative studio)
4. `spatial-map.tsx` (nested maps)
5. Others use fallback until built

---

## Phase F: Integration & Polish

- Wire proposal integrate/decline buttons in `organisms/Proposals.tsx`
- End-to-end surfacing flow
- End-to-end template instantiation
- Keyboard navigation (`use-keyboard.ts`): backtick for visor, arrows for pan, +/- for zoom, Escape to close
- Welcome state for empty world map (guide founder to threshold first organism)
- CSS polish: color tokens, transitions, vitality animations

---

## Build Order & Dependencies

```
A.1 + A.3 + A.4 + A.5 (parallel, no deps between them)
  ↓
A.2 (depends on A.1)
  ↓
B (restructure web — clears path for C+D)
  ↓
C + D + E (parallel — Space, Visor, Renderers)
  ↓
F (integration after C+D+E are functional)
```

---

## Zero New Dependencies

No new npm packages. CSS transforms for canvas. Native PointerEvents for interaction. HTML5 `<audio>` for playback. React Context for state management.

---

## What the Founder Can Do After

1. Log in → see world map (empty, seeded)
2. Open Visor → Compose → threshold organisms (audio, text, image, etc.)
3. Surface organisms onto the world map (curatorial placement with coordinates)
4. Create community organisms (spatial-map + governance composed inside)
5. Zoom into communities to see their internal space
6. Compose organisms inside communities
7. Set governance by composing policy organisms inside parents
8. Review/integrate/decline proposals
9. Create and share templates for common patterns
10. Navigate the ecology through zoom-as-composition-depth
11. Understand any organism through the universal layer

This achieves Phase 1 exit criteria: a visitor can understand what this place is, the founder can do creative work entirely inside Omnilith, composition works, proposals work end-to-end.

---

## Verification

- Run existing tests: `pnpm test` (all 119 should still pass)
- New tests for template content type and instantiation endpoint
- Manual testing: signup → threshold → compose → surface → navigate → propose → integrate
- Verify zero new kernel imports in `packages/kernel/package.json`
- Verify `packages/web/` never imports from `@omnilith/kernel` directly
