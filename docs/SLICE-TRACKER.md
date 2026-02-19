# Slice Tracker Template

Status: Active template  
Updated: February 19, 2026  
Audience: Maintainers, agents  
Canonicality: Working template

Use this template to plan and track one weekly tending cycle and its slices.

---

## Cycle

Cycle label:  
Date range:  
Steward:

### Non-goals (explicitly out this cycle)

- 
- 

### Lane allocation

- `core-integrity` slice:
- `experience` slice:
- `throughput` slice:

---

## Slice

Slice ID:  
Lane (`core-integrity` | `experience` | `throughput`):  
Size (`S` | `M`):  
Status (`planned` | `active` | `blocked` | `done` | `dropped`):

### Intent

One-sentence user outcome:

### Boundary

In scope:

- 

Out of scope:

- 

### Touchpoints

Kernel touchpoints:

- 

API touchpoints:

- 

Rendering touchpoints:

- 

Content types affected:

- 

### Risks

- 

### Acceptance checks

- [ ] User outcome is demonstrably true.
- [ ] Domain rule behavior is implemented or explicitly unchanged.
- [ ] Tests read like domain statements and cover changed behavior.
- [ ] Rendering states are complete (loading/empty/error/auth-required) where applicable.
- [ ] Unknown state handling is safe and legible.
- [ ] `pnpm run check` passes.
- [ ] Follow-up work is captured as new slices.

### Evidence

Automated verification:

- 

Manual verification:

- 

Decision record:

- (if needed) `docs/decisions/NNN-title.md`

### Notes

- 

---

## Cycle Review

Completed slices:

- 

Dropped slices:

- 

Unresolved faultlines to mint into next cycle:

- 

Process adjustments for next cycle:

- 
