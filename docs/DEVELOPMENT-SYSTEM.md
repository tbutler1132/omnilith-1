# Omnilith Development System

Status: Active operational guide  
Updated: February 19, 2026  
Audience: Maintainers, agents  
Canonicality: Implementation workflow (defers to source-of-truth docs)

Use this system to convert broad intent into scoped, end-to-end slices that can ship without drifting beyond Phase 1.

## Why This Exists

Omnilith is large enough that "work on the project" creates scope ambiguity. This guide establishes a repeatable tending rhythm:

- slice by user outcome, not by technical layer
- keep kernel integrity and rendering momentum in balance
- constrain concurrent work to protect focus and quality
- define done in one place so slices actually finish

## The Unit Of Work: A Slice

A slice is one bounded outcome that crosses every layer it needs to cross.

Slice formula:

`user outcome + kernel/API path + rendering path + tests + decision note (if needed)`

Good slice examples:

- Composition panel: a founder composes and decomposes organisms from visor, with boundary behavior preserved.
- Content-type renderer completion: a current state renders, differ is available, and fallback behavior is clear.
- Proposal loop completion: open proposal, evaluate, integrate or decline, visible in universal layer surfaces.

Non-slice examples:

- "Refactor HUD"
- "Work on kernel"
- "Do content types"

## Operating Lanes

Keep exactly three lanes active to prevent local optimization at the expense of system coherence.

1. `core-integrity`  
   Kernel rules, proposal evaluation, composition correctness, capability/auth integrity, event semantics.
2. `experience`  
   Adaptive visor panels, universal layer clarity, systems view legibility, content-type renderer quality.
3. `throughput`  
   Test speed, DX, fixtures, docs hygiene, decision-log hygiene, guardrail automation.

Rules:

- Maximum one active slice per lane.
- Maximum three active slices total.
- No new slice starts until one active slice is done or intentionally dropped.

## Weekly Tending Cycle

Plan in one-week cycles.

Cycle start ritual:

1. Pick exactly 3 slices:
   - 1 from `core-integrity`
   - 1 from `experience`
   - 1 from `throughput`
2. Write explicit non-goals ("not doing this cycle").
3. Set acceptance checks for each slice before implementation.

Cycle end ritual:

1. Demo only shipped, end-to-end outcomes.
2. Record unresolved faultlines as future slices.
3. Capture architectural decisions in `docs/decisions/NNN-title.md` when a decision changes system shape.

## Definition Of Done (Per Slice)

A slice is done only when all applicable checks pass:

- [ ] Target user outcome is true in the product (not just in code).
- [ ] Domain rule behavior is implemented or explicitly unchanged.
- [ ] Tests read like domain statements and cover expected behavior.
- [ ] API path is complete where needed (or explicitly out of scope).
- [ ] Rendering path is complete, including loading/empty/error/auth-required states.
- [ ] Unknown or unsupported states fail safely and legibly.
- [ ] Decision record added when architecture or policy changed materially.
- [ ] `pnpm run check` passes.
- [ ] Out-of-scope follow-ups are captured as new slices, not hidden TODOs.

## Slice Size Heuristic

Prefer slices that complete in 1-3 days.

- `S` (<= 1 day): constrained UX/state behavior update with local test impact.
- `M` (2-3 days): cross-module behavior change with kernel/API/rendering touchpoints.
- `L` (4+ days): split before starting; convert into 2-4 S/M slices.

Default rule: if a slice cannot be demoed end to end by cycle end, split it.

## Prioritization Rules

Use this ordering when choosing next slices:

1. Broken domain invariants (composition, proposal, visibility)  
2. User-blocking read/write path gaps in current Phase 1 flow  
3. High-leverage renderer/panel slices that unlock multiple organisms  
4. Throughput investments that reduce recurring cycle friction

## Faultline Backlog Pattern

Capture work by faultline, then mint slices from each faultline.

Typical faultlines in current Phase 1:

- adaptive visor/HUD panel completion
- content-type renderer + differ completion
- proposal/integration clarity across regulated vs open-trunk organisms
- composition systems view affordances
- cross-cutting query/vitality rendering consistency

Do not schedule faultlines directly. Convert each into concrete slices with acceptance checks.

## Required Slice Spec Template

Create one spec per slice using `docs/SLICE-TRACKER.md`.

Minimum required fields:

- intent (user outcome)
- boundary (in / out)
- kernel touchpoints
- API touchpoints
- rendering touchpoints
- risks
- acceptance checks
- evidence (tests + manual verification)

## Suggested Meeting Cadence (Solo Or Team)

- Monday: choose 3 slices and non-goals (15-30 min)
- Daily: quick lane check and blockers (5-10 min)
- Friday: demo completed slices + mint next candidates (20-30 min)

## Stop Rules

Stop and re-scope when any of these happen:

- slice has no crisp user outcome
- slice exceeds 3 days without demoable value
- slice requires broad kernel changes for a specific content type
- scope expands without updated boundary text

When stopped, split into smaller slices and restart with explicit boundaries.
