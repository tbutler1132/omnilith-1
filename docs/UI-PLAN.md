# Omnilith — UI Build Plan

## Context

Phase 1 backend is complete: kernel (8 infrastructure concerns), content types (Tier 1 + integration policy), API (HTTP adapter), and all 138 tests pass. The dev database seeds a rich world (12 organisms across 6 content types, composition, governance, proposals, 2 users).

This document captures the incremental plan for building the rendering layer — the perceptual interface through which organisms become visible and interactive. It is organized as vertical slices, each delivering a complete interaction loop that works end to end.

### Code Structure Convention

Mirror the backend's separation of concerns. The rule: **if you can't test it without rendering a component, extract it.** Every component should be decomposable into three layers:

- **Pure functions** (`.logic.ts` or `.utils.ts`) — positioning, sizing, transforms, formatting. Zero React. Fully testable.
- **Hooks** (`use-*.ts`) — data fetching, derived state, side effects. Orchestration logic lives here, not in components.
- **Components** (`.tsx`) — receive props, return JSX. Minimal logic. Dumb rendering.

Not every component needs all three files — a 30-line presentational component is fine as-is. But when a component starts mixing data fetching, computation, and rendering, split it. Same philosophy as the backend's `(input, deps)` pattern: everything explicit, nothing hidden.

Shared utilities (like preview text extraction) go in a common utils directory rather than being duplicated across components.

### Guiding Principles (from Foundation + Organism Model)

- **Space is experiential, device is operational.** You encounter organisms in the space. You tend them through the visor.
- **The primary experience is depth, not navigation.** Absorption — being inside something — is the goal. Navigation supports it.
- **The surface is specific, the depth is universal.** Content-type renderers make each organism feel like what it is. The universal layer underneath is always the same shape.
- **The device is a visor, not a panel.** Ambient HUD always present at edges. Not a drawer that opens and closes. Content crossfades based on context.
- **Surfacing is curatorial.** The space shows only what has been deliberately placed on a map. No auto-populating.
- **Vitality informs rendering prominence.** High-vitality organisms are foregrounded. Dormant organisms are quiet.

---

## Navigation Model

One unified navigation mechanic: **camera movement through altitude and position.**

### Discrete Altitude Levels

Instead of continuous zoom (which produces the "lost at 73%" problem), the camera snaps between three altitudes:

| Altitude | What You See | Purpose |
|----------|-------------|---------|
| **High** | Entire map. All surfaced organisms visible as small presences. | Orientation. "Where am I? What's here?" |
| **Mid** | A neighborhood. Organisms are readable — titles, types, visual identity. | Browsing. "What is this cluster of things?" |
| **Close** | A few organisms large on screen. Content starts to resolve. | Approach. "I'm interested in this one." |

Panning works at every altitude. Scroll/pinch snaps between altitudes (with a smooth animated transition). Each altitude level has a fixed zoom value — no in-between states.

### Entering an Organism

Clicking an organism at any altitude triggers a **zoom-enter transition**: the camera animates from the current altitude down through Close and continues into the organism. The map falls away. The organism's content fills the screen. You are "inside."

This is not a modal. It is a continuation of the same camera mechanic. The transition should feel like loading into a level — a smooth, intentional shift from the map into the organism's interior.

**Exiting** reverses the transition: zoom back out, the map reappears, you land at Close altitude centered on the organism you just left.

### Ground Plane Landmarks

The map needs visual texture so you always know where you are:

- **Grid lines** — subtle, consistent reference frame
- **Coordinates** — visible at grid intersections, especially at High altitude
- **Compass** — persistent orientation indicator on the HUD
- Organisms cast subtle shadows or have presence indicators that make the space feel inhabited, not flat

The goal is a map that feels like a place, not a blank canvas with dots on it.

---

## The HUD (Visor)

The visor is a persistent heads-up display. It does not open or close. It is always present at the edges of the screen.

### Behavior

- **On the map:** Minimal controls. Compass, coordinates/altitude indicator, a few action buttons (threshold, personal organisms). Quiet. The space is the focus.
- **Inside an organism:** The organism's universal layer information fades in on the HUD — state history, composition, vitality, governance, proposals. Map-level controls fade out. The content-type renderer fills the main viewport.
- **Transitions are crossfades.** When you enter an organism, HUD elements smoothly transition from map context to organism context. No panel animations, no drawer slides.

### HUD Elements

Always present:
- Compass / orientation
- Current altitude or "inside [organism name]"
- Back / zoom-out affordance

Map context (fades in at map altitudes):
- Threshold button (introduce new organism)
- "My organisms" access
- Search / filter

Organism context (fades in when inside):
- Universal layer sections (vitality, composition, state history, governance, proposals)
- Content-type-specific actions
- Back to map

---

## Build Slices

### Slice 1: The Ground Plane

**Goal:** The map renders and feels like a place you can move through.

**What gets built:**
- Snap-zoom between three discrete altitudes (smooth animated transitions)
- Pan at every altitude
- Grid lines rendered on the map surface
- Coordinate labels at grid intersections
- Organisms rendered as positioned presences on the map (from spatial-map state)
- Organism appearance scales with altitude (small dots at High, readable cards at Close)
- Keyboard shortcuts: scroll to change altitude, arrow keys or drag to pan

**What it connects to:**
- API: `GET /platform/world-map` → spatial-map organism → entries with coordinates
- API: `GET /organisms/:id` → organism + current state for each entry

**Done when:** You can navigate a map with 8 organisms on it, snap between altitudes, pan around, and always know where you are thanks to the grid. The map feels spatial, not like a UI.

**Existing code reuse:**
- KEEP: `use-spatial-map.ts`, `SpaceLayer.tsx`
- REWORK: `viewport-math.ts` (replace continuous zoom with altitude snap), `use-viewport.ts` (adjust animation for discrete levels), `SpaceViewport.tsx` (snap instead of continuous), `SpaceOrganism.tsx` (altitude-responsive rendering)

---

### Slice 2: The Zoom-Enter Transition

**Goal:** Clicking an organism takes you inside it. Zooming out brings you back to the map.

**What gets built:**
- Click handler on organisms triggers zoom-enter animation
- Camera animates past Close altitude into the organism interior
- Map fades out, organism content fills viewport
- Content-type renderer loaded for the organism's current state
- Exit transition: zoom back out, map fades in, land at Close altitude
- Escape key triggers exit
- Navigation state tracks "on map at altitude X" vs "inside organism Y"

**What it connects to:**
- API: `GET /organisms/:id` → full organism data for interior view
- API: `GET /organisms/:id/states` → current state with content type and payload
- Content-type renderer registry → loads appropriate renderer

**Done when:** You can click an organism on the map, watch the camera zoom into it, see its content rendered full-screen, press Escape, and smoothly return to the map. The transition feels like entering a level.

**Existing code reuse:**
- REPLACE: `FocusLens.tsx` → new organism interior view
- REWORK: `Space.tsx` (integrate enter/exit state machine), `PlatformContext.tsx` (track map-vs-interior state)
- KEEP: `renderers/registry.ts`, `renderers/text.tsx`, `renderers/fallback.tsx`

---

### Slice 3: The HUD

**Goal:** Persistent overlay that shows contextual information without opening/closing.

**What gets built:**
- HUD chrome rendered as fixed-position overlay at screen edges
- Map context: compass, altitude indicator, coordinates, threshold button, my-organisms button
- Organism context: universal layer info (current state summary, composition, vitality)
- Crossfade between contexts based on navigation state (map vs interior)
- Back button in organism context that triggers exit transition

**What it connects to:**
- Navigation state from Slice 2 (are we on the map or inside?)
- API: organism data already fetched in Slice 2

**Done when:** The HUD is always visible. On the map you see compass + altitude + action buttons. Inside an organism you see its universal layer info. Transitions between contexts are smooth crossfades. Nothing "opens" or "closes."

**Existing code reuse:**
- REPLACE: `Visor.tsx` → new HUD component
- KEEP: `VisorHere.tsx` (thin wrapper, relocate), `UniversalLayer.tsx`, `Composition.tsx`
- REWORK: `PlatformContext.tsx` (remove visorOpen boolean, add HUD context state)

---

### Slice 4: The Organism Interior

**Goal:** When inside an organism, you see its content rendered beautifully with the universal layer on the HUD.

**What gets built:**
- Full-screen content-type renderer for the focused organism
- Text renderer: properly styled markdown reading view
- Fallback renderer: clean display for content types without a specific renderer (audio, image metadata)
- Universal layer sections on the HUD: state history timeline, composition tree (children + parent), vitality indicator, governance (policy organisms), open proposals
- Each section is real data from the API, not placeholder

**What it connects to:**
- API: `GET /organisms/:id/states` → state history
- API: `GET /organisms/:id/children` → composition
- API: `GET /organisms/:id/parent` → parent link
- API: `GET /organisms/:id/proposals` → open proposals
- API: `GET /organisms/:id/relationships` → governance info

**Done when:** You enter the essay organism and see its markdown rendered beautifully. The HUD shows its 2-state history, that it has no children or parent, its vitality, and no governance policies. You enter the album organism and the HUD shows its 3 composed tracks. You enter the regulated work and the HUD shows its integration policy and the open proposal from the guest user.

**Existing code reuse:**
- KEEP: `UniversalLayer.tsx`, `Composition.tsx`, `hooks/use-organism.ts` (all 9 data hooks), `api/organisms.ts`, `api/client.ts`
- Renderers: expand `text.tsx`, improve `fallback.tsx`

---

### Slice 5: Actions

**Goal:** You can do things, not just look at things.

**What gets built:**
- Threshold: introduce a new organism from the HUD (content type picker, payload form)
- Compose: add a child organism to the currently focused organism
- Propose: offer a new state for a regulated organism
- Integrate / Decline: resolve proposals on organisms you steward
- All actions trigger through HUD buttons in the appropriate context

**What it connects to:**
- API: `POST /organisms` → threshold
- API: `POST /organisms/:id/children` → compose
- API: `POST /organisms/:id/proposals` → propose
- API: `POST /proposals/:id/integrate` → integrate
- API: `POST /proposals/:id/decline` → decline
- World map update after threshold (surface the new organism)

**Done when:** The full creative loop works: threshold a new text organism, see it appear on the map, enter it, propose a state change from the guest account, switch to dev account, see the proposal on the HUD, integrate it, see the state advance. Compose a new organism into the album. The write path is complete.

**Existing code reuse:**
- KEEP: `ThresholdForm.tsx`, `OrganismPicker.tsx`, `VisorCompose.tsx`
- Wire into HUD context instead of visor panel

---

## What We Are Not Building Yet

- Audio player / waveform renderer (Slice 4 uses fallback renderer for audio)
- Image display renderer (same — fallback for now)
- Systems view (the structural composition workspace)
- 3D anything
- Real-time collaboration
- Search / filtering beyond basic organism list
- Continuous zoom (can be added after snap zoom is solid)

---

## Technical Notes

### Auth in Dev

The dev seed creates a persistent session (`dev-session-00000000`) for `dev@omnilith.local`. The web client can use this token directly during development to skip the login flow while building UI.

### Content-Type Renderer Contract

Renderers receive the organism's current state and render it. The registry maps `contentTypeId` → React component. Unknown types fall back to a generic display. Renderers should be loaded dynamically so new content types don't bloat the initial bundle.

### State Management

`PlatformContext` (useReducer) tracks:
- Navigation: map altitude + position, or inside organism ID
- HUD: which context is showing (derived from navigation)
- Focused organism data (fetched on enter)

No global state library. React context + reducer is sufficient for Phase 1.

### CSS Strategy

Minimal, functional CSS. No component library. The aesthetic should emerge from the content and spatial design, not from UI chrome. The HUD should be nearly invisible — thin text, subtle indicators, transparency.
