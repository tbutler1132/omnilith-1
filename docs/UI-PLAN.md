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

- **Two modes, one screen.** The Space is experiential — you are present in a world, encountering organisms. The Visor is operational — you are tending, governing, composing. These are not different pages. They are different stances toward the same reality. The rendering shifts to support whichever stance you are in.
- **The platform defaults to presence.** When you enter an organism, you are there to experience it. The operational layer is available when you reach for it, not imposed when you arrive. Absorption is the default. Tending is the deliberate act.
- **The primary experience is depth, not navigation.** Absorption — being inside something — is the goal. Navigation supports it.
- **The surface is specific, the depth is universal.** Content-type renderers make each organism feel like what it is. The universal layer underneath is always the same shape.
- **The visor is AR, not a panel.** The visor is like augmented reality glasses — a persistent overlay on the same world, not a separate interface. You never leave the space. The visor gives you a different layer of information over the same reality. Pulling it up does not take you somewhere else. It augments where you already are.
- **Surfacing is curatorial.** The space shows only what has been deliberately placed on a map. No auto-populating.
- **Vitality informs rendering prominence.** High-vitality organisms are foregrounded. Dormant organisms are quiet.

---

## The Two Modes

### Space (Experiential)

The Space is where you are a visitor, an audience member, someone moving through a world and encountering things. You navigate the map. You enter organisms. You experience their content — listen to a track, read an essay, take in a visual work. The Space is where absorption happens. The Space is where beauty lives.

In this mode, the screen is dominated by the world itself. The map, or the organism's content. Chrome is minimal — just enough orientation to know where you are (compass, altitude, organism name). Nothing competes with the work.

### Visor (Operational)

The Visor is where you are a steward, a tender, someone doing work. You see state history, governance, composition, open proposals. You threshold new organisms, propose state changes, integrate contributions, compose organisms into larger wholes.

The Visor does not take you to a different place. It is an augmented layer over the same Space. Pull it up and you see the operational reality of whatever you are looking at — the same organism, the same map, now annotated with the information you need to tend it. Put it down and you are back to pure experience.

### The Gesture

The visor has a deliberate toggle — a gesture that says "I want to see the operational layer now." This is not a mode switch in the heavy sense. It is closer to putting on glasses. Quick, reversible, non-disruptive.

When the visor is **down** (default):

- On the map: minimal orientation chrome (compass, altitude, coordinates). The space is the focus.
- Inside an organism: the content-type renderer fills the screen. You are with the work. Nothing else.

When the visor is **up** (deliberate gesture):

- On the map: action buttons appear (threshold, my organisms, search). Map-level operational affordances.
- Inside an organism: universal layer information fades in at the edges — state history, composition, vitality, governance, proposals. Content-type-specific action buttons appear. The content remains visible and central. The operational layer augments it, does not replace it.

The transition between visor-down and visor-up is a crossfade. Elements appear and disappear smoothly. Nothing slides in from a side. Nothing opens or closes. The world stays put. Information becomes more or less visible.

---

## Navigation Model

One unified navigation mechanic: **camera movement through altitude and position.**

### Discrete Altitude Levels

Instead of continuous zoom (which produces the "lost at 73%" problem), the camera snaps between three altitudes:

| Altitude  | What You See                                                             | Purpose                                     |
| --------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| **High**  | Entire map. All surfaced organisms visible as small presences.           | Orientation. "Where am I? What's here?"     |
| **Mid**   | A neighborhood. Organisms are readable — titles, types, visual identity. | Browsing. "What is this cluster of things?" |
| **Close** | A few organisms large on screen. Content starts to resolve.              | Approach. "I'm interested in this one."     |

Panning works at every altitude. Scroll/pinch snaps between altitudes (with a smooth animated transition). Each altitude level has a fixed zoom value — no in-between states.

### Entering an Organism

Clicking an organism at any altitude triggers a **zoom-enter transition**: the camera animates from the current altitude down through Close and continues into the organism. The map falls away. The organism's content fills the screen. You are "inside."

This is not a modal. It is a continuation of the same camera mechanic. The transition should feel like loading into a level — a smooth, intentional shift from the map into the organism's interior.

**On entry, the visor is down.** You arrive in experiential mode. You are there to be with the work. The operational layer is available when you reach for it.

**Exiting** reverses the transition: zoom back out, the map reappears, you land at Close altitude centered on the organism you just left. The visor returns to whatever state it was in on the map.

### Ground Plane Landmarks

The map needs visual texture so you always know where you are:

- **Grid lines** — subtle, consistent reference frame
- **Coordinates** — visible at grid intersections, especially at High altitude
- **Compass** — persistent orientation indicator (always visible, visor up or down)
- Organisms cast subtle shadows or have presence indicators that make the space feel inhabited, not flat

The goal is a map that feels like a place, not a blank canvas with dots on it.

---

## The HUD (Visor Chrome)

The HUD is the rendering of the visor. It is a fixed-position overlay at the edges of the screen. Its contents change based on two dimensions: where you are (map vs inside an organism) and whether the visor is up or down.

### Always Visible (Visor Up or Down)

- Compass / orientation
- Current altitude or "inside [organism name]"
- Back / zoom-out affordance
- Visor toggle affordance (the gesture target)

These are pure orientation elements. They support spatial awareness without competing with the experience.

### Map Context, Visor Down

Nothing beyond the always-visible elements. The space speaks for itself.

### Map Context, Visor Up

- Threshold button (introduce new organism)
- "My organisms" access
- Search / filter

### Organism Context, Visor Down

Nothing beyond the always-visible elements. The content-type renderer fills the viewport. You are with the work.

### Organism Context, Visor Up

- Universal layer sections: state history timeline, composition tree (children + parent), vitality indicator, governance (policy organisms), open proposals
- Content-type-specific actions (propose, compose, etc.)
- The content remains visible and central. Operational information is arranged at the edges, augmenting the view.

### Transitions

All transitions between visor states are crossfades. Elements fade in and out smoothly. The world does not move. Nothing slides. The visor is a change in what is visible, not a change in where you are.

Entering an organism resets the visor to down. This is a philosophical commitment: the platform defaults to presence. You arrive to experience. You reach for the operational layer when you are ready to tend.

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
- **Visor resets to down on entry** — you arrive in experiential mode

**What it connects to:**

- API: `GET /organisms/:id` → full organism data for interior view
- API: `GET /organisms/:id/states` → current state with content type and payload
- Content-type renderer registry → loads appropriate renderer

**Done when:** You can click an organism on the map, watch the camera zoom into it, see its content rendered full-screen with no operational chrome, press Escape, and smoothly return to the map. The transition feels like entering a level. The arrival feels like presence.

**Existing code reuse:**

- REPLACE: `FocusLens.tsx` → new organism interior view
- REWORK: `Space.tsx` (integrate enter/exit state machine), `PlatformContext.tsx` (track map-vs-interior state, visor up/down state)
- KEEP: `renderers/registry.ts`, `renderers/text.tsx`, `renderers/fallback.tsx`

---

### Slice 3: The HUD

**Goal:** Persistent overlay with two layers — always-visible orientation, and the visor's operational augmentation.

**What gets built:**

- HUD chrome rendered as fixed-position overlay at screen edges
- Always-visible layer: compass, altitude/location indicator, back affordance, visor toggle
- Visor toggle gesture (keyboard shortcut + clickable affordance)
- Map context, visor up: threshold button, my-organisms button, search
- Organism context, visor up: universal layer summary (details deferred to Slice 4)
- Crossfade transitions for all visor up/down changes
- Visor resets to down on organism entry (coordinated with Slice 2 navigation state)

**What it connects to:**

- Navigation state from Slice 2 (map vs interior, which organism)
- Visor state: up or down (new state dimension in PlatformContext)

**Done when:** The HUD is always present but minimal. On the map with visor down, you see only compass + altitude. Pull visor up, action buttons fade in. Enter an organism, visor drops — you see only the work and minimal orientation. Pull visor up inside, operational info fades in at edges. All transitions are smooth. Nothing opens or closes. The world never moves.

**Existing code reuse:**

- REPLACE: `Visor.tsx` → new HUD component with visor-up/visor-down states
- KEEP: `VisorHere.tsx` (thin wrapper, relocate), `UniversalLayer.tsx`, `Composition.tsx`
- REWORK: `PlatformContext.tsx` (remove visorOpen boolean, add visor up/down + navigation state)

---

### Slice 4: The Organism Interior

**Goal:** When inside an organism, the content is beautiful in experiential mode, and the operational layer is rich when you reach for it.

**What gets built:**

- Full-screen content-type renderer for the focused organism (visor down — the default arrival)
- Text renderer: properly styled markdown reading view, designed for absorption
- Fallback renderer: clean display for content types without a specific renderer (audio, image metadata)
- Visor-up layer: universal layer sections on the HUD edges — state history timeline, composition tree (children + parent), vitality indicator, governance (policy organisms), open proposals
- Each section is real data from the API, not placeholder
- Content remains visible and central when visor is up. Operational info augments, does not replace.

**What it connects to:**

- API: `GET /organisms/:id/states` → state history
- API: `GET /organisms/:id/children` → composition
- API: `GET /organisms/:id/parent` → parent link
- API: `GET /organisms/:id/proposals` → open proposals
- API: `GET /organisms/:id/relationships` → governance info

**Done when:** You enter the essay organism and see its markdown rendered beautifully, full-screen, nothing else. Pull visor up — state history, composition, vitality fade in at the edges while the essay remains readable. You enter the album organism, visor down — you see the album. Visor up — the HUD shows its 3 composed tracks. You enter the regulated work, visor up — the HUD shows its integration policy and the open proposal from the guest user. The experience of toggling the visor feels like shifting your attention, not switching modes.

**Existing code reuse:**

- KEEP: `UniversalLayer.tsx`, `Composition.tsx`, `hooks/use-organism.ts` (all 9 data hooks), `api/organisms.ts`, `api/client.ts`
- Renderers: expand `text.tsx`, improve `fallback.tsx`

---

### Slice 5: Actions

**Goal:** You can do things, not just look at things. All actions live in the visor-up layer.

**What gets built:**

- Threshold: introduce a new organism (visor up on map — content type picker, payload form)
- Compose: add a child organism to the currently focused organism (visor up inside organism)
- Propose: offer a new state for a regulated organism (visor up inside organism)
- Integrate / Decline: resolve proposals on organisms you steward (visor up inside organism)
- All actions are accessed through visor-up HUD elements. Visor down = pure experience. Visor up = where you can act.

**What it connects to:**

- API: `POST /organisms` → threshold
- API: `POST /organisms/:id/children` → compose
- API: `POST /organisms/:id/proposals` → propose
- API: `POST /proposals/:id/integrate` → integrate
- API: `POST /proposals/:id/decline` → decline
- World map update after threshold (surface the new organism)

**Done when:** The full creative loop works: pull visor up on the map, threshold a new text organism, see it appear on the map. Enter it — visor drops, you're with the work. Pull visor up, propose a state change from the guest account. Switch to dev account, enter the organism, pull visor up, see the proposal, integrate it, see the state advance. Compose a new organism into the album via visor-up. The write path is complete. The boundary between experiencing and tending is clean: visor down to be present, visor up to act.

**Existing code reuse:**

- KEEP: `ThresholdForm.tsx`, `OrganismPicker.tsx`, `VisorCompose.tsx`
- Wire into visor-up HUD context instead of visor panel

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
- Visor: up or down (independent of navigation — persists on map, resets to down on organism entry)
- Focused organism data (fetched on enter)

The visor state is a single boolean. The HUD rendering is derived from visor state × navigation state. This gives four combinations (map/down, map/up, interior/down, interior/up), each with a clear set of visible elements.

No global state library. React context + reducer is sufficient for Phase 1.

### CSS Strategy

Minimal, functional CSS. No component library. The aesthetic should emerge from the content and spatial design, not from UI chrome. The HUD should be nearly invisible — thin text, subtle indicators, transparency. When visor is down, the chrome should approach zero. When visor is up, it should feel like a translucent overlay, not a toolbar.
