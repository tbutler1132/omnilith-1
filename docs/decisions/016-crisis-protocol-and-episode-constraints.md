# 016 — Crisis Protocol and Episode Constraints

## Context

Two regulatory principles from the Becoming Engine that apply to how episodes (timeboxed interventions) should work, both at the personal level and eventually as platform-level patterns.

## Decision

### Episode Constraints

A regulated system limits how many experiments it runs simultaneously:

- **Max 1 active Explore episode per organism.** You can only run one hypothesis-driven experiment at a time. Everything else is maintenance. This prevents the common failure mode of running five experiments simultaneously, learning nothing from any of them, and burning out.
- **Max 1 active Stabilize episode per variable.** If a variable is drifting, you address it with one bounded intervention, not three overlapping ones.
- **Episodes must be closeable by design.** An episode that cannot end is not an episode — it is a lifestyle change pretending to be temporary. Explore episodes require a model update (explicit learning) to close. Stabilize episodes close when the variable returns to range.

### Crisis Protocol

When the system is overwhelmed:

1. Suspend all exploratory work
2. Allow only stabilization actions
3. Block irreversible decisions
4. Seek external support

This is not a feature to build — it is a pattern to recognize. A crisis is when multiple variables are out of range simultaneously. The correct response is to stop exploring and start stabilizing.

## Relationship to Omnilith

### Platform level

These constraints could be encoded as policy organisms. A community that composes an "episode policy" organism inside itself would get regulatory constraints on how many active experiments the community runs at once. This is not a kernel feature — it is a content type (Tier 3) composed inside an organism.

### Personal organisms

The Tier 3 content types (Sensor, Variable, Prediction, Response Policy) could implement these constraints directly. A personal organism with episode-tracking and variable-monitoring organisms composed inside it would naturally produce the crisis protocol as emergent behavior: when multiple sensor organisms report out-of-range variables, a response policy organism could surface a "crisis mode" recommendation.

### Immediate practical application

The principle is already relevant to the founder's personal system. The Montreal countdown involves multiple simultaneous threads (social exposure, habits, Omnilith, music, French, housing). The episode constraint says: pick one as the active experiment. Let the rest be maintenance rhythms. If multiple things go sideways, invoke the crisis protocol — stop exploring, stabilize, block big decisions.

## Rationale

Unbounded experimentation produces noise, not learning. Bounded experimentation with explicit learning artifacts produces models that compound over time. The constraint is not a limitation — it is the mechanism that makes learning possible.
