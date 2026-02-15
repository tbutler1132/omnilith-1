# Omnilith — Decision Log: The Organism Model Sessions

## Purpose

This document captures the reasoning process, key debates, and design decisions that led to the Organism Model document. It exists so that future sessions can pick up with full context — not just what was decided, but why, what alternatives were considered, and where open questions remain.

---

## The Starting Question

The conversation began with a simple question: can the system be built so that everything is composed of the fundamental pattern described in the Foundation document? Not just as a hidden backend reality, but as something users actually feel — where the uniformity of the primitive IS the experience, the way Notion's "everything is a page" is the experience.

## Key Moves in the Reasoning

### Move 1: The Notion Analogy

Notion's power isn't that "page" is a good abstraction. It's that the uniformity compounds — you learn one interaction model and it works everywhere. The question became: what happens when the uniform primitive is richer than a page? When it includes regulation, versioning, composition, and boundary?

The initial answer was that this gives you a consistent interaction vocabulary across everything: see current state, see history, propose changes, look inside, see governance. That vocabulary is always available, and it compounds as users learn the system.

### Move 2: Should the Primitive Be Simpler?

There was a push to strip the primitive down to the absolute minimum — just identity, state, and composition. Maybe even remove versioning and make it something the environment provides. The argument was that simpler primitives make the emergence more genuine and the simple cases more lightweight.

**This was rejected by the founder.** The key insight: making the primitive simpler gives you files, blocks, pages — solved problems. The interesting and novel move is to start at a higher level of abstraction where the primitive already has organism-like properties. The platform isn't about composing inert data. It's about composing self-regulating living things.

### Move 3: Emergence Is Real, Not Definitional

A critical clarification from the biological analogy. In real systems, cybernetic properties are genuinely emergent — a neuron doesn't think, a molecule doesn't self-regulate. Complex behavior belongs to the composition, not the parts. This means:

- The primitive should NOT be called a "cybernetic unit" — that names it after a property it doesn't have at the smallest scale
- Cybernetic behavior should genuinely emerge from composing the right organisms together
- The primitive needs to be simple enough that emergence is real, but complex enough to be more than just a file

This resolved the tension: the primitive has identity, state, and composition. Regulation is not built in — it emerges when policy organisms are composed inside a parent. The primitive is more than a page but less than a full cybernetic agent.

### Move 4: The Identity Threshold

The founder described their own creative process: material doesn't become a "thing" until it develops identity. Before that, it's just exploration. After that, it's worth tending and protecting.

This became a core architectural concept. The platform doesn't handle pre-identity material (or handles it only lightly). The platform's job begins at the moment of recognition — when something has enough coherence to deserve organism status. This means:

- The platform is not a creative tool (not Ableton, not Google Docs)
- The platform is where living things go to exist in relationship
- The act of introducing something to the platform is itself a creative act — recognizing life
- The simplest case doesn't feel heavy because the simplest case is just working outside the system; the platform only engages when there's something worth engaging with

### Move 5: Not Everything Is an Organism

A key confusion arose around "member organisms" — if everything is the same primitive, is a person's membership in a community an organism? This led to an important clarification:

- A person is NOT an organism. A person is the subject — the gardener, not the garden.
- Membership is NOT an organism. It's a relationship — connective tissue between people and organisms.
- Infrastructure (storage, auth, composition engine) is NOT organisms. It's the physics that makes organisms possible.
- Rendering is NOT an organism. It's the perceptual interface.

This produced the four-category ontology: Infrastructure, Organisms, Relationships, Rendering. Everything in the system falls into exactly one category.

### Move 6: Personal Organisms

The founder raised the idea that people should be able to maintain personal organisms — not representing themselves, but representing their creative practice. This was validated as:

- Consistent with the architecture (just another organism configuration)
- Genuinely useful (makes creative trajectory legible)
- Different from self-optimization tools (honest mirror, not productivity tracker)
- Creates natural interface between personal and collective (you can see where your trajectory aligns or diverges from communities you're part of)

The key constraint: personal organisms must not become self-optimization tools. The viable range applies — the floor is self-knowledge, the ceiling is algorithmic selfhood.

### Move 7: Rendering — Universal Layer + Content-Specific

The UI is not an organism. It is the perceptual interface. But it has a dual structure:

- **Content-type-specific rendering** makes each organism feel like what it is (songs have players, communities have maps, etc.)
- **Universal layer** gives every organism the same deeper affordances (history, composition, governance, proposals)

This maps to the Foundation document's aesthetic spectrum: the surface is specific and beautiful, the depth is universal and strange. The journey is inward.

### Move 8: The Build Is Two Layers

The practical conclusion:

1. **Infrastructure** — the eight concerns (organism identity, state management, composition, visibility and access, proposal evaluation, event emission, content type registration, and querying). Small, universal, rock solid. Built once.
2. **The app** — a specific configuration of organisms with specific content types and a specific rendering. The first app is the creative studio. But it's one expression, not the platform itself.

New capabilities come from new content types and new renderings, not from infrastructure changes. AI agents can generate content type implementations from behavioral descriptions, making this feasible at a pace that wouldn't have been possible before.

### Move 9: Infrastructure Revised from Six to Eight Operations

The original six operations were pressure tested. Two were confirmed sound but reframed (content type registration is really a plugin/extension system, not an "operation"). Two new operations were identified as missing:

**Visibility and access** was added because it creates a chicken-and-egg problem if modeled as an organism. You need to see an organism to read its policy organisms, but visibility policies would need to be read before you can see anything. Visibility is the outer boundary check that happens before any other interaction. It must be infrastructure.

**Querying** was added because the rendering layer depends heavily on cross-cutting retrieval. "Show me everything in this community with open proposals" crosses organism identity, state, composition, and relationships. Without rich querying as infrastructure, the rendering layer would have to do enormous assembly work, and views would be brittle and slow.

**Proposal evaluation** was debated — it could theoretically be an emergent behavior of composition (just a composition query plus content type logic). It was kept as infrastructure because it is safety-critical: a bug in proposal evaluation means someone bypasses governance. Safety-critical operations belong in the physics, not in emergent behavior.

### Move 13: Hexagonal Reframed as Kernel Architecture

The hexagonal architecture framing was questioned. The core discipline — domain at center, no external dependencies, everything adapts to it — is correct and retained. But hexagonal vocabulary suggests two zones (domain and adapters), while the system actually has three:

1. **Kernel** — the eight infrastructure operations. Pure logic. Zero external dependencies. Like an OS kernel.
2. **Plugins** — content types. Like device drivers. Teach the kernel how to handle specific data. Depend only on kernel contracts.
3. **Adapters** — API, storage, rendering. Connect the kernel to the outside world. Implement outbound ports.

The reframe matters because content types don't fit neatly into either hexagonal zone. They're not the domain (they're extensions) and they're not adapters (they're not translating between the domain and external systems). They're plugins — a third concept that hexagonal doesn't name. The three-zone model tells developers exactly where things go.

The package structure was updated: `packages/domain/` became `packages/kernel/`. Hard rules clarify that kernel imports nothing, content-types import only kernel contracts, and new capabilities enter only through the plugin layer.

### Move 12: Three-Level Composition Interface

The question arose of whether there should be an actual UI for composing organisms. The answer is yes, but at three distinct levels:

1. **Implicit composition** — the most common. Adding a song to an album, inviting a member, setting a policy. The interface speaks in specific terms ("add track"), not organism terms. Composition happens but no structural UI is shown.

2. **The universal layer** — informational. Available on every organism, shows what's inside, what it's inside of, who governs it. Primarily for understanding structural context, not for editing.

3. **The systems view** — a dedicated composition workspace for structural work. Shows all children of an organism laid out with connections and relationships explicit and editable. This is where cybernetic loops are wired, governance structures are designed, and complex compositions are understood.

The systems view is where the organism primitive becomes visible to users who want to see it. It maps to the aesthetic spectrum from the Foundation document — the surface is beautiful and specific, the systems view is the deeper, stranger, more structural layer. Most users never open it. Founders and community architects use it for structural work.

AI agents can assist in the systems view by composing and connecting organisms from natural language descriptions of intent, which users can then review and adjust.

### Move 11: Symbolic Dilution Addressed Through Vitality

An external critique argued that the organism metaphor is doing too much symbolic work — that calling a revenue distribution policy or a sensor an "organism" stretches the biological metaphor to the point of dilution, especially at scale when the platform fills with hundreds of small, low-intensity organisms.

The critique was largely misplaced on its own terms but pointed at something real. The misplacement: users never see the word "organism." The rendering layer presents everything through content-type-specific interfaces. Nobody encounters "Visibility Policy Organism." They see a visibility settings interface. The metaphor is an architectural concept for the design team, not a user-facing brand. Symbolic dilution in the user experience is not a real risk.

What the critique actually pointed at: **clutter**. At scale, a community might contain hundreds of organisms of wildly different significance. A song the community spent months on and a governance policy set once and never changed are the same primitive, but they have very different experiential weight. If the rendering treats them equally, the space becomes overwhelming and nothing feels alive.

The resolution was **vitality** — an observable property derived from an organism's recent activity (state changes, open proposals, linked threads, composition activity, contributor engagement). Vitality is not a type distinction or a new category. It is data the querying infrastructure already has, used by the rendering layer to determine prominence.

High-vitality organisms are foregrounded. Low-vitality organisms are available but quiet. Dormancy is the natural endpoint of zero vitality over an extended period — the organism is not dead, but its dormancy is visible.

This also resolves the previously open dormancy question. Dormancy is not a status to be declared. It is a visible consequence of sustained low vitality. An organism can be reawakened at any time.

Key principle established: **the primitive is universal, the rendering is differential.** The architecture is uniform. The experience is not. Same thing underneath, different experiential weight based on how alive it actually is.

### Move 10: Identity Threshold Hardened

An external critique identified the identity threshold as the weakest conceptual point in the system. The critique argued that the documents oscillated between three incompatible positions — identity as discovered, declared, or maintained — and that the threshold behaved more like legal incorporation than biological emergence.

The critique was about 70% right. The oscillation was real and would create design problems. But the proposed resolution — reducing the threshold purely to "commitment to stewardship" — flattened something phenomenologically true about creative work. When a track crosses from noodling to "this is something," that moment is primarily perceptual, not volitional. The commitment follows the perception.

The resolution was a three-phase model:

1. **Coherence is perceived.** Happens outside the platform. Fuzzy, probabilistic, may dissolve. The platform does not track this.
2. **Stewardship is assumed.** The threshold itself. A performative act motivated by genuine perception. The person says "I perceive coherence and I'm willing to tend it." The platform trusts this without validating it and provides structure.
3. **Identity is maintained.** Where the organism spends its life. Identity is not born at threshold — it is sustained through ongoing regulatory activity, state accumulation, and care. If nobody tends it, it goes dormant.

Key design implications:
- The threshold is intentional but lightweight. It does not require certainty.
- "I'm putting this here to see if it grows" is as valid as "this is my life's work."
- The biological analogy is honest about where it holds (ongoing maintenance, emergence through composition) and where it is metaphor (the initial act of introduction is human, not chemical).
- The pre-identity fuzziness problem is solved not by making the threshold fuzzy, but by making it low-cost and reversible.

---

### Move 14: Organism Composition as Creative Practice

The founder articulated an insight that was latent in the architecture but never named directly: organism composition is itself a creative act, and the platform is the medium for that practice.

The initial Notion analogy (Move 1) asked about structural similarity — both systems use a single primitive that composes into everything. But the founder's reframe went deeper. The question was not "is it like Notion?" but "is organism composition a new art form?" The answer: yes. Content types (audio, text, image, governance, sensors) are materials. The organism is the medium. Composition is the technique. The person working on the platform is an organism composer.

This does not contradict the Foundation's statement that "Omnilith is not where you make things." Raw creative material still originates elsewhere. But the compositional act — placing organisms in relationship, designing boundaries, shaping how a system behaves — is creative work that happens on the platform. An album is not just a container for songs. It is its own organism whose coherence is the composer's contribution.

The insight also reframes forking as a creative practice analogous to sampling or quoting — a dialogue between composers across boundaries with preserved lineage. And it reframes the platform as a whole: a community of organism composers working in a shared medium, producing an ecology that no individual could create alone.

This was added to the Organism Model document (Section IV, "Composition as Creative Practice").

### Move 15: The Blank Slate, Templates, and Pattern-Aware Rendering

The founder asked a practical question: if the platform is a blank ecology and the founder is the first organism composer, how do you nudge people toward useful patterns (like communities) without hardcoding those patterns as features?

Three mechanisms were identified, none requiring kernel changes:

**Living examples.** The founder's own compositions are the documentation. A visitor explores a well-composed community through the universal layer and understands the pattern. This is compositional knowledge demonstrated, not explained.

**Templates as organisms.** A template is a content type whose state describes a composition recipe. "Start a tribe" reads the recipe and orchestrates existing kernel operations (create organisms, compose them, wire relationships). Templates are organisms — they have state history, accept proposals, can be forked. The founder's templates are compositional knowledge made shareable. Crucially, templates require zero kernel changes. They are pure orchestration of existing operations, validating the architecture.

**Pattern-aware rendering.** The rendering layer recognizes composition patterns and offers appropriate affordances. An organism containing governance + members + creative works gets community-like rendering. An organism containing ordered audio organisms gets album affordances. This is not type enforcement — the kernel has no concept of "community." It is the rendering layer observing what is inside an organism and responding. If someone composes something unanticipated, the universal layer still works. Specialized rendering for new patterns can be added later.

The key principle: **nudging through composition, not structure.** The founder's examples and templates are suggestions from the first composer, not walls built into the infrastructure. Someone could compose something entirely different and the platform supports it fully.

This was added to the Organism Model document across three sections: pattern-aware rendering in Section III, the blank slate and first composer in Section IV, and the template content type in Section V.

### Move 16: Space and Device — Two Modes of Rendering

The rendering layer was refined into two distinct modes of engagement:

**The space** is the world. A spatial environment where organisms exist with position, scale, and presence. The user moves through it, encounters organisms, listens, reads, absorbs. The space is how spatial-map organisms get rendered — a navigable environment. This is where beauty and absorption live.

**The device** is the user's personal interface. Pulled up when they need to act rather than experience — edit, propose, compose, check history, open the systems view, review policies. The device provides cross-cutting views powered by the query port: all open proposals, all policy organisms (queried by content type on current state), all organisms where the user holds integration authority. These views are just different queries rendered as navigable lists.

The separation preserves absorption. The default state is being in the space. The device is a deliberate shift — the Foundation's principle that "the system tracks time so the inhabitant can lose it" is served by keeping the action interface separate from the experience of being present.

Both modes are pure rendering. The kernel knows nothing about space or devices. The space renders spatial-map organisms. The device renders the universal layer, systems view, and query results. No kernel changes.

This was added to the Organism Model document (Section III, Rendering).

### Move 17: Templates as Soft Ontology

The kernel has a minimal formal ontology: organism, state, composition. It deliberately says nothing about what kinds of things exist. But people work with recognizable patterns — communities, albums, projects. Where does that vocabulary live?

The answer: templates collectively form a **material ontology** — a local, evolvable description of what kinds of things are meaningful in a given space. This produces a clean two-layer structure:

- **Formal ontology** (kernel): organism, state, composition. Universal. Fixed.
- **Material ontology** (templates): the kinds of things people actually work with. Local. Evolvable. Made of organisms.

The founder's initial templates define the initial material ontology. Communities develop their own templates over time, which means they develop their own categories. A music collective has different templates (and therefore a different ontology) than a writing workshop. Same kernel. Different material realities.

Because templates are organisms, the ontology itself is subject to proposals, forking, and evolution. The ontology is not designed once and imposed — it emerges and adapts. And because templates are not enforced, the ontology is always a suggestion. Someone can compose from scratch without ever touching a template.

This was added to the Organism Model document (Section V, "Templates as Soft Ontology").

### Move 18: Rendering the Ontology

The founder raised a practical concern: templates as a concept are powerful, but the default template experience (dropdown, pick a name, fill in fields) is boring and fails to communicate what templates actually are — a living catalog of possibilities.

The resolution: the template content-type renderer should make the material ontology feel spatial, visual, and discoverable rather than administrative. Four rendering strategies were identified:

1. **Templates in the space.** Surfaced as organisms in the world. Encountered spatially, not picked from a list.
2. **Living previews.** The renderer shows the compositional structure visually — the shape of what you would get.
3. **Exemplars.** Templates link to living instances. The best explanation of a community is a community that works.
4. **Pattern recognition during composition.** The rendering layer notices when a user's freeform composition starts to resemble a known template and offers to complete the pattern. The ontology is discovered through composition, not memorized upfront.

All rendering concerns. Zero kernel changes. The quality of this experience depends entirely on the template content-type renderer and the pattern-aware rendering layer.

This was added to the Organism Model document (Section V, "Rendering the Ontology").

### Move 19: General-Purpose Composition Platform, Not Creative Studio App

A significant strategic reframe. The previous framing was: "build universal infrastructure, then build a creative-studio-shaped app on top." The new framing: **build the general-purpose organism composition platform. The creative studio is the first thing composed on it.**

The distinction:
- **Old:** The kernel is universal, but the app layer (API, rendering) is shaped for a music collective. The platform could theoretically support other use cases, but the first build is a specific creative studio.
- **New:** The platform IS the composition experience — space, device, organism creation, templates, content-type renderers. There is no app layer between the kernel and the rendering. The founder dogfoods the platform by composing a creative studio on it. Another user could compose something entirely different using the same platform.

This simplifies the build. There is no music-specific rendering logic or creative-studio-specific app layer to design. The rendering layer serves the general composition experience. Content-type renderers handle the specifics (audio gets a player, text gets an editor). What makes the world feel like a music studio is what the founder composes, not what the code hardcodes.

The pitch crystallizes: **when something is worth tending, giving it a life is effortless — and the life it gets is richer than anything else.** Important clarification: the pitch is NOT "same ease as Notion." The identity threshold remains intentional. You do not create organisms with a keystroke. You create them when you recognize something worth tending. The threshold is low but real. The space has signal because everything in it was placed by someone who meant it.

Pre-threshold work stays on-platform through organisms designed for it — an ideas organism (open-trunk, append freely) holds seeds that have not yet crossed the threshold. The ideas organism itself is tended. When an idea inside it coheres, it becomes its own organism. This is the garden bed model: the bed is an organism, the seeds are potential, sprouting is the threshold.

This also reframes Phase 1. The exit criteria remain the same (a visitor can understand what this place is, the founder can do creative work inside Omnilith, composition works, proposals work). But the build target shifts from "creative studio app" to "composition platform that the founder uses to build a creative studio."

This was added to the Organism Model document (Section IV, "The General-Purpose Composition Platform").

### Move 20: Surfacing, the Visor, and Collaborative Culture

Three connected UX decisions were made:

**Surfacing as the curatorial act.** Organisms exist in the device from the moment of threshold, but they are NOT in the space until deliberately surfaced — placed on a spatial-map organism with coordinates. Surfacing is the equivalent of publishing. The space shows only what has been intentionally placed. This keeps the world curated and meaningful. If the map has governance, surfacing may require a proposal.

**The visor model.** The device is a visor with two states. The ambient HUD is always present — containment breadcrumb, subtle tending indicators, identity of focused organism. The full device fades in over the dimmed space when invoked. The space stays visible underneath, blurred. Dismiss and the space returns. Quick, natural transition between absorption and action.

**The space as 2D zoomable canvas.** Not a 3D virtual world — honest about being an interface while still feeling spatial. Zoom level maps to composition depth. Pan/zoom transitions give a sense of travel between places without being gimmicky. Physical limits and finite space create the feeling of a shared habitat.

**Collaborative culture.** The founder clarified that communities own their organisms collectively. A community is not a gallery of individual portfolios surfaced together — it is a collective that produces and tends organisms together. Members contribute through proposals, not by displaying personal work. This is a cultural principle, not a kernel constraint. Communities can configure however they want, but the founder's initial compositions and templates set a collaborative default.

This was added to the Organism Model document: space/device/surfacing details in Section III (Rendering), collaborative culture in Section IX (Design Principles).

### Move 21: Platform Structural Givens and Device Categorization

Two clarifications about what the platform provides versus what users compose:

**Platform structural givens.** "General-purpose" does not mean "no opinions." The platform defines the physics users build in. Three structures are provided because without them the shared habitat cannot exist:

1. **The world map** — a top-level spatial-map organism. This IS the platform. It has governance. Communities are surfaced here. Without a world map, there is no world.
2. **Personal organisms** — every user gets one. Their creative practice, their home. Without a personal organism, users have nowhere to work from.
3. **The device** — the visor. The rendering interface. Without it, users cannot interact.

These are gravity, not features. Everything else — communities, albums, projects, governance structures — is composed by users.

**Device is rendering, not an organism.** The device is the lens you see through, not a thing you tend. It does not have identity, coherence, or evolutionary potential. The Design Principles section says "the power of the concept depends on reserving it for things that genuinely have identity." The device fails that test. Making it an organism would be like making your eyeball an organism — it is the thing you see WITH.

The map, by contrast, IS an organism. World map, community maps, personal space maps — all spatial-map organisms with identity, state history, and governance. The map is the territory. The device is the visor you wear while standing in the territory.

This was added to the Organism Model document: Platform Structural Givens in Section III (after Organisms), device categorization in Section III (Rendering).

### Move 22: Zoom-Responsive Rendering and the Space/Visor Split

Walking through the exact navigation experience revealed a problem with the initial plan: if organisms in the space are only compact previews (icons, titles) and you always open the visor to actually view them, then the space is just a fancy icon grid and the visor is "where you actually look at things."

The refinement: **content-type renderers respond to zoom level on a continuous spectrum, not a binary compact/full toggle.** Zoomed out, organisms are small visual presences. Zoomed in, they expand and resolve — images fill their area, text becomes readable, audio becomes playable. You experience organisms in the space. The visor is specifically for tending — composition, governance, proposals, state history, vitality.

The split: **space is experiential, visor is operational.** You don't open the visor to look at a song. You hear it in the space. You open the visor to tend it.

The renderer contract passes `zoom: number` and `focused: boolean` instead of a mode enum. Each content type decides its own zoom breakpoints.

### Move 23: Home Page Organisms — Public Presence vs Private Workspace

The personal organism was originally conceived as the user's space — their creative practice, trajectory, and body of work. But a tension emerged: the personal organism is fundamentally private and regulatory (a workspace), yet users need a public presence in the world.

The founder proposed a second organism created at signup: the **home page organism.** Where the personal organism is your workshop, the home page is your face. It is the thing you surface to join the world — your visible creative expression, your self-portrait on the platform. Surfacing it onto the commons is the ritual of arrival.

Key distinction: the personal organism is about regulation (where you work, where ideas incubate). The home page organism is about expression (what you show the world, how you present yourself). Both are just organisms — both have state history, vitality, composition. But they serve different purposes and have different visibility.

Signup now creates both from templates: a personal organism (private spatial-map) and a home page organism (starter template, any content type). Onboarding guides the user to surface their home page, completing their arrival.

---

## Open Questions

These were raised but not fully resolved. They should be addressed in future sessions.

### Naming the Primitive

"Organism" is the working term. It's good because it conveys aliveness without overclaiming specific capabilities. Alternatives discussed: "node" (too loaded with network/graph connotations), "cell" (nice biological resonance but might confuse with spreadsheets), "entity" (too generic), "element" (too inert). The right name may emerge through building.

### The Pre-Identity Space (Partially Resolved)

The three-phase identity model clarifies that pre-identity exploration is Phase 1 (coherence is perceived) and happens mostly outside the platform. The threshold is intentional but lightweight — low-cost and reversible rather than sacred and permanent. This resolves the risk of premature formalization.

What remains unresolved: should the platform offer a dedicated pre-identity workspace (a scratchpad, a sandbox) or leave this entirely to external tools? If there is a scratchpad, what is its relationship to the organism model? Is it simply a space with no organisms, or is it something else entirely? The answer may depend on how the first creative studio users actually work.

### Death and Dormancy (Resolved)

Resolved through the vitality concept. Dormancy is not a status to be declared — it is a visible consequence of sustained low vitality (no state changes, no proposals, no discussion, no composition activity over an extended period). Dormant organisms are not dead. They can be reawakened at any time. But their dormancy is visible, making the aliveness of active organisms feel genuine by contrast. The rendering layer handles this naturally by foregrounding high-vitality organisms and backgrounding dormant ones.

### Real-Time Coordination (Mostly Resolved)

The proposal-integration model is inherently asynchronous. This was initially flagged as a potential problem for real-time interactions. After analysis, most real-time scenarios fall into two categories that don't require new infrastructure:

**Handled by configuration.** Collaborative editing works through independent working states that reconcile via proposals. Conversation works through open-trunk organisms where anyone can append directly — no proposal needed, but state history and events still work normally. Presence and ambient awareness can be modeled as organisms with periodically updated state and appropriate content-type rendering. Open trunk is the key configuration lever — it makes the regulatory barrier zero while preserving everything else about the organism model.

**Outside the model entirely.** Real-time synchronous creation (jamming, live performance, simultaneous signal generation) is pre-identity activity. It happens before anything has crossed the identity threshold. The platform can integrate with external real-time tools (WebRTC, shared DAW sessions, etc.) but the real-time experience itself doesn't need to be an organism. What comes out of it — recordings, ideas, things that achieve coherence — enters the platform as organisms.

**One area may need infrastructure attention.** Real-time collaborative manipulation of existing organisms — two people simultaneously rearranging a map, restructuring an album's composition — creates conflicts the proposal model handles awkwardly. This may require concurrent editing support (operational transforms or CRDTs) at the state management level for certain content types. This would be an enrichment of the existing state management concern, not a new infrastructure concern. Content types could declare themselves as "concurrently editable" and the state management layer would handle merge resolution instead of requiring proposals.

### Creative Conflict (Resolved)

The organism model provides four structural supports for creative conflict that most platforms lack:

- **Visibility** — conflicts happen around visible artifacts (proposals, orientations, governance), keeping the substance on the record rather than trapped in private conversations.
- **Memory** — declined proposals, past states, and contribution history are preserved. Decisions can be revisited when an organism's evolution reveals new context.
- **Forking as divergence** — when agreement is impossible, forking allows graceful divergence with preserved lineage. Speciation is not failure. Both directions can thrive.
- **Governance as organism** — power structures are visible, proposable, and evolvable. Governance disputes have the same legibility as creative disputes.

The model explicitly does NOT try to handle the emotional and interpersonal dimensions of conflict. Those need human resolution. The system's job is to handle structural and creative dimensions cleanly so that interpersonal tensions do not get entangled with questions of power, fairness, and process.

A potential **Conflict Thread** content type was identified — a thread linked to a specific disagreement that carries structured information about positions, process, and outcome. This makes conflicts first-class parts of a community's history and supports organizational learning.

### Content Type Design (Resolved)

Every content type is a five-part contract: state schema, renderer, differ, validator, and optionally an evaluator. This contract is the single extension point through which new capabilities enter the system.

Content types are organized into four tiers representing a natural build order:

- **Tier 1 — Creative Fundamentals:** Audio, Text/Markdown, Image, Spatial Map, Composition Reference. The minimum for a working creative studio.
- **Tier 2 — Governance and Regulation:** Integration Policy, Membership Policy, Visibility Policy. Required when communities grow.
- **Tier 3 — Awareness and Self-Knowledge:** Sensor, Variable, Prediction, Response Policy. The cybernetic layer, achieved through composition not installation.
- **Tier 4 — Economic:** Paywall Policy, Revenue Distribution Policy. Required when ready to generate revenue.

Minimum viable launch requires Tier 1 plus the simplest Integration Policy from Tier 2. Each subsequent tier is added by registering new content types — the infrastructure never changes.

Schema rigidity should be strict for policy types (governance bugs are dangerous) and flexible for creative types (creative work is unpredictable and the schema should not constrain expression).

### Aesthetic Integration

The founder has an aesthetic document that should inform the rendering layer. The organism model defines what gets rendered. The aesthetic document should define how it feels. These need to be integrated in the next phase of design work.

### Move 24: Organism Identity Independence

The founder identified a philosophical tension: the platform claims organisms have real, persistent identity, but if all identity lives on one server, that identity is contingent on one person's infrastructure. This contradicts the claim that organisms are genuinely alive and persistent.

The question was whether blockchain or distributed technology could solve this. The answer: **the instinct is right, but the solution is not blockchain-as-feature.** The existing architecture already points toward identity independence through content-addressed storage (Git), immutable states, hash chains, port abstractions, and the event system.

The decision establishes five things that belong:
1. **Content-addressed state hashing** for all payloads (extending what Git already does for text)
2. **Organism portability** — exportable, self-contained, verifiable packages
3. **Optional public identity anchoring** — lightweight proofs (not content) on a public ledger
4. **Lineage verification** — independently verifiable fork provenance
5. **Federation** (Phase 6) as the real distributed story

And four things that do not belong:
1. State payloads on-chain (expensive, pointless)
2. Smart contracts for governance (policy organisms are fundamentally better — evolvable, proposable, content-typed)
3. Tokens, NFTs, or financialization (directly contradicts the viable range ceiling)
4. Dependency on any specific chain

Nothing changes in the Phase 1 build. The decision validates existing architectural choices — the `ContentStorage` port abstraction, immutable states, the event system — and records that identity independence is a design principle the architecture should continue to support.

See `docs/decisions/009-organism-identity-independence.md` for the full decision.

### Move 25: The Economic Ceiling — Revenue Without Optimization

The founder raised a pragmatic concern: can the platform actually sustain itself while refusing to build the measurement infrastructure that most platforms use to optimize revenue?

The initial position — pure subscription, no economic data for anyone — was too idealistic. The Foundation already contemplates "the platform takes a cut." And working artists need economic information about their own practice. Denying stewards their own revenue data in the name of philosophical purity is paternalistic and makes the platform unusable for anyone trying to make a living.

The refined position draws a clear line: **the danger is not revenue, it's feedback loops.** Economic data flowing to stewards is a bank statement. Economic data flowing to the rendering layer is extraction.

The economic model has six structural elements:

1. **Base subscription** to inhabit the platform — decouples platform survival from transaction volume
2. **Modest transaction cut** — the platform participates in upside without depending on it
3. **Stewards see their own economic data privately** — no comparative data, no optimization tools, no analytics
4. **No consumption metrics, structurally absent** — no play counts, no view counts, no download counts. The data does not exist. This is the immovable constraint.
5. **No comparative economic data** — no leaderboards, no "trending," no rankings
6. **Pricing as curatorial act** — a deliberate statement, not a variable to optimize

The key architectural implication: the event system's scope must be explicitly limited to actions (state changes, proposals, integrations), never passive consumption (views, plays). The rendering layer reads vitality (creative activity) but never economic data. The query port does not support consumption queries because the underlying data doesn't exist.

The analogy: Omnilith should be a city (property taxes, maintained infrastructure, what happens inside is inhabitants' business) not a mall (percentage of every sale, foot traffic optimization, tenant placement analytics).

See `docs/decisions/010-economic-ceiling.md` for the full decision.

### Move 26: AI and the Regulatory Core — Three Zones of Human and Machine

The founder articulated an insight that resolves the platform's relationship to AI without needing AI-specific policies: **the platform naturally sits at the human judgment layer.** Thresholding, integrating, declining, surfacing, and composing are inherently human acts. The architecture doesn't need to restrict AI — it's built around the things AI can't meaningfully do.

This produces three concentric zones:

1. **Pre-threshold (AI-welcome).** The generative space before the identity threshold. Use whatever tools you want — AI, instruments, pen and paper. The platform doesn't care how material was produced. The threshold act is what matters: a human recognizing coherence and committing to tend it. A proposal's value is judged by its quality and intentionality, not its origin.

2. **The regulatory core (human judgment).** Threshold, integrate, decline, surface, compose, tend. These are the acts that constitute organism identity. AI here would be meaningless, not forbidden — an AI integrating proposals is automation, not governance. The platform's value IS human judgment applied to creative work.

3. **External interface (AI-powered).** Two dimensions. First, platform development — AI generating content types, renderers, API connectors, sensor adapters. The five-part content type contract is a natural AI generation target. Second, organism periphery — AI powering the cybernetic layer's interface with the external world. Sensor organisms using AI to monitor signals, response policies adapting content for external platforms, API connectors translating between internal state and external systems. The organism lives on the platform, tended slowly by humans. Its external presence can be rapid and AI-powered.

The biological analogy: conscious judgment (regulatory core) coexists with autonomic systems (AI periphery). Both are part of the organism. Neither replaces the other.

Spam and quality are handled by existing mechanisms — policy organisms evaluate proposals regardless of origin, the threshold act discourages mass-generation, declined proposals are visible in contribution history. No AI detection or labeling infrastructure is needed.

Critically, **nothing changes architecturally.** This decision articulates what the existing architecture already produces. The platform's relationship to AI is a consequence of building around human judgment, not a policy bolted on top.

A concrete elaboration of Zone 3 was added: the **AI-powered cybernetic loop.** The existing Tier 3 content types (Sensor, Variable, Prediction, Response Policy) already describe a sensing-evaluating-acting loop. AI slots in as a component — the policy's evaluator calls a model, and the result is either direct execution (low stakes) or a generated proposal for human review (high stakes). The degree of automation is configured through governance, not hardcoded. Three specific content types would make this native: an AI evaluator (wraps a model call), a webhook action (how organisms affect the external world), and a conditional proposal generator (AI does the analysis, human makes the call). All Tier 3. All enter through the registry. The kernel doesn't change.

See `docs/decisions/011-ai-and-the-regulatory-core.md` for the full decision.

---

## Strategic Horizons

These are not decisions. They are observations about where the architecture naturally points — ideas that emerged from the sessions that produced Moves 24–26. Nothing here changes the Phase 1 build. But these threads are worth preserving because they connect into a coherent picture of the platform's longer-term potential.

### The universal tending layer

The organism model does not require the thing being tended to live on the platform. An organism's state is self-describing — the payload can be a reference to an external system plus metadata about decisions made about it. An "external-system" content type (state: repo reference, deployment hash, configuration) would let someone govern a standalone app through Omnilith's organism model. Proposals become deployment approvals. Sensor organisms monitor the live system. The cybernetic loop (AI evaluator + response policy) detects problems and generates rollback proposals. The organism's state history becomes a governed record of every decision made about that system — not just what changed, but why, who decided, and what was declined.

This means Omnilith could function as a governance and decision-making layer for anything worth tending, not just things that live on the platform. Creative works, communities, external apps, infrastructure, processes. The organism doesn't have to contain the thing. It tends the thing. This is a natural extension of the content type system — no kernel changes, just a new content type with sensors and webhook actions as connective tissue.

### Apps as organisms

A sufficiently complex composition of organisms with the right content types and renderers IS an application. The architecture already provides everything an app needs: data model (organisms with content types), business logic (policy evaluators), UI (content-type renderers), permissions (visibility and integration policies), and external integrations (sensors, webhooks). Apps built as organisms would get identity, history, governance, forking, and composition for free — things no app platform currently provides. Templates would make app patterns shareable and forkable.

Performance constraints (immutable state history, evaluation overhead) limit this to apps where governance, collaboration, and evolution matter more than raw throughput. That covers a lot of ground.

### The scarcity of judgment

As AI makes creation cheap, the scarce resource shifts from making things to recognizing what's worth keeping. Omnilith's architecture is built around exactly this scarce resource — the threshold act, integration, surfacing, governance. The platform's value proposition strengthens as generative AI improves, because the platform doesn't compete on creation speed. It competes on what happens after creation: identity, tending, composition, and the governed evolution of living things. The three-zone AI model (pre-threshold generation is cheap, the regulatory core is human, the external interface is AI-powered) positions the platform naturally in this landscape.

### How these connect

Identity independence (009) means organisms are verifiable regardless of where they or the things they tend live. The economic model (010) means the platform sustains itself without optimizing the activity inside it. The AI model (011) means human judgment stays at the center while AI handles generation and peripheral sensing. External tending means the platform's reach extends beyond its own infrastructure. Apps as organisms means the composition model scales to functional systems, not just creative works.

Together: **Omnilith is a universal tending layer where anything worth caring about can have identity, governance, history, and composition — tended by humans, assisted by AI, sustained by a non-extractive economic model, with identity that persists independent of any single infrastructure.** That is the long-game picture. Phase 1 builds the foundation that makes all of it possible.

### Move 27: The Visor as Independent Device — Universal Tending Interface

The Visor is the user's personal device for tending organisms. It is completely independent of the user's position in the space — any organism can be opened in the Visor at any time, regardless of where the user is on the map and regardless of whether the organism is surfaced.

**The Visor has its own consistent visual aesthetic.** Every organism viewed in the Visor gets the same digital/holographic treatment — flat, clean, slightly otherworldly. This is the "looking through a device" feel. Surfaced and unsurfaced organisms look identical in the Visor. The Visor doesn't care about surfacing status — it shows the digital representation of the organism for tending purposes.

**The Visor view consists of two parts:**
1. The content-type renderer — showing the organism's current state.
2. A collapsible sidebar (default open) — proposals, composition, state history, governance. The universal layer for tending.

**Surfacing status is communicated through contextual actions, not visual treatment:**
- Surfaced organisms get a "Visit" button (navigate to their location on the map).
- Unsurfaced organisms get a "Surface" button (place them in the world).

**The spatial connection:** When a user is visiting a surfaced organism in the space, a small affordance (button) is available to open that specific organism in the Visor. This is a convenience shortcut — like tapping something in front of you to pull it up on your phone. But the same organism could be opened from anywhere via the device.

**The distinction between space and Visor is experiential vs operational:**
- The space is where you experience organisms — you visit them, listen, read, absorb. Surfaced organisms have physical presence, dimensionality, a place in the world. Content-type renderers respond to zoom level.
- The Visor is where you tend organisms — propose, integrate, compose, inspect history. The digital treatment is consistent regardless of what you're looking at or where you are.

This means surfacing gains real weight. An unsurfaced organism exists only in the Visor — you can tend it, but it has no place in the world. Surfacing gives it spatial presence that the Visor alone does not provide. The organism goes from existing only as data on your device to being a thing in the world that others can encounter.

**What this changes for the current implementation:**
- `ChildItem` in HudInteriorInfo currently calls `exitOrganism()` then `focusOrganism(childId)`, which tries to navigate to the child on the map. This should instead open the organism in the Visor.
- The Visor needs to support opening arbitrary organisms independent of spatial navigation.
- The OrganismInterior component (space rendering) and Visor rendering are separate code paths with different visual treatments but shared content-type renderers.

No kernel changes. This is purely a rendering architecture decision.

### Move 28: State Transition Validation — Content Types Should Enforce Payload Continuity

The current kernel treats every `appendState` call identically: validate the new payload against the content type schema, append it as a new immutable state. The kernel has no concept of the *relationship* between consecutive states — it doesn't know whether the new state is a minor edit, a complete replacement, or an additive accumulation.

This is correct at the kernel level. States are complete snapshots. The kernel's job is state management, not payload semantics.

However, this creates a real risk for open-trunk organisms where the state payload represents an accumulating structure. The world map is the clearest example: its spatial-map state contains an `entries` array of every surfaced organism. The application-level pattern (in `packages/web/src/api/surface.ts`) is read-modify-write — fetch current state, add the new entry, append the whole thing back. But nothing enforces this. A buggy or malicious append could replace the entire map with a single entry, wiping everything.

The same risk applies to threads (append-only conversations where a bad append could erase all previous posts) and any content type where the payload is meant to grow, not replace.

**Decision:** State transition validation belongs in content type validators, not in the kernel. The kernel stays simple — it appends states. Content types that need payload continuity should enforce it by accepting the previous state in their validation step and checking transition rules:

- A spatial-map validator could reject appends that remove existing entries without explicit authorization.
- A thread validator could enforce that all previous posts are preserved in the new state.
- Creative content types (text, audio, image) would continue to allow full replacement, since each state is genuinely a new version.

This is not urgent for Phase 1 with a single user, but becomes critical before multi-user scenarios where concurrent appends or accidental overwrites could cause data loss. The read-modify-write pattern is also inherently vulnerable to race conditions (two concurrent appends each read the same state, both write back, one clobbers the other).

**What changes:**
- The `ContentTypeContract.validate` signature may need access to the previous state (currently it only receives the new payload).
- No kernel changes — this is purely a content type concern.
- Implementation priority: before the platform goes multi-user.

**What does NOT change:**
- The kernel's state model (complete immutable snapshots, append-only history).
- The `appendState` use case (validate, append, emit event).
- Open-trunk semantics (still bypass proposal evaluation, still require valid payloads).

---

## Summary of What We're Building

A platform with a thin, stable infrastructure layer that provides eight universal operations (identity, state, composition, visibility and access, proposal evaluation, events, content type interpretation, and querying). Everything above that layer is organisms — living things with identity, state history, and composability. Users are people, not organisms. They tend organisms, propose changes to them, compose them into larger wholes, and recognize when new organisms have emerged. The first app built on this platform is a creative studio for music production, but the platform itself is universal. New capabilities are created by designing new organism content types, not by writing new platform code. The rendering layer presents organisms through content-type-specific interfaces with a universal deeper layer that reveals the consistent underlying structure. The goal is a system where users feel the aliveness and composability of everything they interact with, and where emergence is real — complex behavior arising from simple organisms composed together.
