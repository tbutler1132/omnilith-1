# 013 — Depth Levels of Access

## Context

An observation about how engagement with the platform deepens through five distinct levels. Each level unlocks different capabilities and carries different weight.

## Decision

Access to organisms and the platform is understood through five depth levels:

### Depth 0 — Experience

Unlocks: consumption, enjoyment, emotional resonance.

No agency. No obligation. You encounter the work and it either moves you or it doesn't. This is where most visitors live. The rendering layer serves this level — content-type renderers make organisms encounterable without requiring understanding of the underlying structure.

### Depth 1 — Understanding

Unlocks: context, intent, meaning, orientation.

Still no agency. Still safe. The universal layer serves this level — you can see an organism's state history, composition, governance, and vitality. You understand what this thing is and how it lives, without being able to change it.

### Depth 2 — Participation

Unlocks: commentary, suggestions, collaboration, influence (but not authority).

You can affect direction but not truth. Threads, proposals from forks, discussion. Your voice is heard but integration decisions belong to others.

### Depth 3 — Agency

Unlocks: editing, proposing changes, shaping process, touching in-progress work.

Now your actions have consequences. Branching, committing, opening proposals. You are a contributor whose work enters the regulatory process.

### Depth 4 — Authority

Unlocks: committing changes, approving releases, changing rules, redefining process.

This is rare. This is heavy. This is earned. Integration authority, governance, founding. The regulatory core where human judgment constitutes organism identity.

## Relationship to Omnilith

These levels map onto existing infrastructure:

- **Depth 0** → public visibility, content-type renderers
- **Depth 1** → public visibility, universal layer (history, composition, governance views)
- **Depth 2** → membership (member role), thread participation, cross-boundary proposals
- **Depth 3** → membership with branch/commit/propose capabilities
- **Depth 4** → integration authority, founder role, governance

The visibility system (`public`, `members`, `private`) controls which depth levels are accessible. The membership and role system determines which capabilities are unlocked at each depth.

## Design Implication

The rendering layer should be designed with these levels in mind. The transition from one depth to the next should feel like going deeper into the same thing, not switching modes. The Foundation's aesthetic spectrum (elegant surface → strange depth) maps onto this: Depth 0 is the elegant encounter, Depth 4 is the deep structural layer.

## Rationale

This framework makes the access control system conceptually coherent rather than just a permissions matrix. Each level has a distinct experiential quality and a distinct relationship to the work. The platform communicates "you can go deeper" without forcing depth on anyone.
