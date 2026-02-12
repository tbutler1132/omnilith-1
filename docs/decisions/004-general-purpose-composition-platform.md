# 004 — General-Purpose Composition Platform, Not Creative Studio App

## Context

The Foundation and Organism Model docs previously framed the build as: universal kernel + specific creative studio app on top. The first app would be a music collective's creative world. The platform could theoretically support other use cases, but the code would include a creative-studio-shaped app layer.

The founder recognized that this framing was backwards. The organism composition experience itself is the product. The creative studio is what the founder composes on it.

## Decision

Omnilith is the general-purpose organism composition platform. There is no app layer between the kernel and the rendering. The rendering layer (space, device, content-type renderers, templates, pattern-aware rendering) IS the product.

The founder dogfoods the platform by composing the first creative studio on it. What makes the world feel like a music studio is what the founder composes — not what the code hardcodes.

Another user could compose something entirely different (a research collective, a governance experiment, a spatial art installation) using the same platform, the same primitive, the same composition experience.

## Rationale

- **Simpler build.** No music-specific or creative-studio-specific app layer to design. Content-type renderers handle specifics (audio gets a player, text gets an editor). The general composition experience serves all use cases.
- **Honest architecture.** The kernel is already universal. Making the rendering layer universal too means the universality goes all the way through, not just the backend.
- **Clearer pitch.** "When something is worth tending, giving it a life is effortless — and the life it gets is richer than anything else" is more compelling and honest than "it's a music platform with a universal kernel." Note: the pitch is NOT "same ease as Notion." The identity threshold remains intentional. You do not create organisms with a keystroke. You create them when you recognize something worth tending. The threshold is low but real.
- **Pre-threshold work stays on-platform.** An ideas organism (open-trunk, append freely) keeps the entire creative process on-platform without cheapening the primitive. The ideas organism is tended. The ideas inside it have not crossed the threshold. When one coheres, it becomes its own organism.
- **Better dogfooding.** The founder using the platform to compose the first world is a stronger test than the founder using a custom app layer that other users won't get.
- **Phase 1 exit criteria unchanged.** A visitor still needs to understand what this place is. The founder still needs to do creative work inside Omnilith. Composition and proposals still need to work end-to-end. The target is the same — the path is cleaner.
